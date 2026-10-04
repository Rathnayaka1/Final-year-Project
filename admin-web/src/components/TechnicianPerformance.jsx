import { useState, useEffect } from "react";
import { predictPerformance as callPredictAPI } from "../services/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ── Constants ──────────────────────────────────────────────
const VEHICLE_TYPES = ["Car", "Van", "Cab"];
const SERVICE_TYPES = ["Body Wash", "Full Body", "Interior"];  // Must match model training
const SERVICE_DISPLAY = { "Body Wash": "Body Wash", "Full Body": "Full Body", "Interior": "Interior Cleaning" };
const EXPECTED_TIMES = { "Body Wash": 1.0, "Full Body": 3.0, "Interior": 9.0 };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TECHNICIAN_IDS = ["tec_01", "tec_02", "tec_03"];  // Only model-trained IDs
const CENTER_IDS = ["SC001", "SC002", "SC003", "SC004", "SC005"];  // Model-trained center IDs
const TECH_COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#eab308", "#ef4444"];

const LEVELS = [
  { key: "excellent", label: "Excellent", min: 75, color: "#10b981", bg: "#d1fae5", icon: "🏆" },
  { key: "good", label: "Good", min: 60, color: "#3b82f6", bg: "#dbeafe", icon: "✅" },
  { key: "normal", label: "Normal", min: 45, color: "#f59e0b", bg: "#fef3c7", icon: "🟡" },
  { key: "needstraining", label: "Needs Training", min: 0, color: "#ef4444", bg: "#fee2e2", icon: "🔴" },
];

function scoreOf(sr, successRate, customerRating, experience) {
  if (!sr) return 0;
  const s = Math.min(sr / 1.3, 1) * 40;
  const q = (customerRating / 5) * (successRate / 100) * 40;
  const e = Math.min(experience / 12, 1) * 20;
  return +(s + q + e).toFixed(1);
}

function levelOf(score) {
  return LEVELS.find((l) => score >= l.min) || LEVELS[3];
}

function emptyForm(id) {
  return {
    id, technicianId: "", centerId: "", vehicleType: "", serviceType: "",
    month: "", experience: "", jobCount: "",
    workSuccessRate: "", customerRating: "", actualTime: "", expectedTime: "",
  };
}

// ── Tiny reusable components ───────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
    {children}
  </div>
);

const Input = ({ placeholder, type = "text", value, onChange, min, max, step, accent }) => (
  <input
    className="input-focus"
    type={type} value={value} onChange={onChange} placeholder={placeholder}
    min={min} max={max} step={step}
    style={{
      width: "100%", boxSizing: "border-box", padding: "9px 12px",
      border: `1.5px solid ${accent || "#e5e7eb"}`, borderRadius: 8,
      fontSize: 14, color: "#111827", outline: "none", fontFamily: "inherit",
      background: accent ? "#f9fafb" : "#f8fafc", transition: "all 0.2s ease",
    }}
  />
);

const Select = ({ value, onChange, options, placeholder }) => (
  <select
    className="input-focus"
    value={value} onChange={onChange}
    style={{
      width: "100%", boxSizing: "border-box", padding: "9px 12px",
      border: "1.5px solid #e5e7eb", borderRadius: 8,
      fontSize: 14, color: value ? "#000" : "#6b7280",
      outline: "none", fontFamily: "inherit", background: "#f8fafc",
      transition: "all 0.2s ease",
    }}
  >
    <option value="" disabled hidden>{placeholder}</option>
    {options.map((o) => <option key={o} value={o} style={{ color: "#000" }}>{o}</option>)}
  </select>
);

// ── Radar / Spider chart (SVG) ─────────────────────────────
function RadarChart({ techs }) {
  const dims = ["Speed", "Quality", "Success", "Experience", "Rating"];
  const colors = TECH_COLORS;
  const cx = 160, cy = 155, r = 110;
  const n = dims.length;

  const axes = dims.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
  });

  const rings = [0.25, 0.5, 0.75, 1].map((frac) =>
    dims.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${cx + r * frac * Math.cos(angle)},${cy + r * frac * Math.sin(angle)}`;
    }).join(" ")
  );

  const techPoints = techs.map((t) => {
    const sr = t.expectedTime && t.actualTime ? t.expectedTime / t.actualTime : 0;
    const vals = [
      Math.min(sr / 1.5, 1),
      (Number(t.customerRating) / 5) * (Number(t.workSuccessRate) / 100),
      Number(t.workSuccessRate) / 100,
      Math.min(Number(t.experience) / 12, 1),
      Number(t.customerRating) / 5,
    ];
    return vals.map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${cx + r * v * Math.cos(angle)},${cy + r * v * Math.sin(angle)}`;
    }).join(" ");
  });

  return (
    <svg viewBox="0 0 320 310" style={{ width: "100%", maxWidth: 320 }}>
      {/* Rings */}
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {/* Axes */}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="#d1d5db" strokeWidth={1} />
      ))}
      {/* Labels */}
      {axes.map((a, i) => (
        <text key={i} x={a.x + (a.x > cx ? 8 : a.x < cx - 2 ? -8 : 0)}
          y={a.y + (a.y > cy ? 14 : a.y < cy - 2 ? -6 : 4)}
          textAnchor={a.x > cx + 5 ? "start" : a.x < cx - 5 ? "end" : "middle"}
          fontSize={10} fill="#6b7280" fontWeight="600">{dims[i]}</text>
      ))}
      {/* Tech polygons */}
      {techPoints.map((pts, i) => (
        <polygon key={i} points={pts}
          fill={colors[i]} fillOpacity={0.15}
          stroke={colors[i]} strokeWidth={2} strokeLinejoin="round" />
      ))}
      {/* Legend */}
      {techs.map((t, i) => (
        <g key={i}>
          <rect x={10} y={270 + i * 14} width={10} height={10} rx={2} fill={colors[i]} />
          <text x={24} y={279 + i * 14} fontSize={10} fill="#374151" fontWeight="600">
            {t.technicianId || `Technician ${t.id}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Bar chart (SVG) ────────────────────────────────────────
function BarChart({ techs, scores }) {
  const colors = TECH_COLORS;
  const h = 160, w = 280, barW = 52, gap = 20;
  const maxScore = 100;

  return (
    <svg viewBox={`0 0 ${w} ${h + 50}`} style={{ width: "100%", maxWidth: 300 }}>
      {/* Y gridlines */}
      {[25, 50, 75, 100].map((v) => {
        const y = h - (v / maxScore) * h;
        return (
          <g key={v}>
            <line x1={30} y1={y} x2={w} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={26} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
          </g>
        );
      })}
      {/* Bars */}
      {techs.map((t, i) => {
        const x = 40 + i * (barW + gap);
        const bh = (scores[i] / maxScore) * h;
        const y = h - bh;
        const lv = levelOf(scores[i]);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={6}
              fill={colors[i]} fillOpacity={0.85} />
            <text x={x + barW / 2} y={y - 5} textAnchor="middle"
              fontSize={11} fontWeight="700" fill={colors[i]}>{scores[i]}</text>
            <text x={x + barW / 2} y={h + 14} textAnchor="middle"
              fontSize={9} fill="#374151" fontWeight="600">
              {t.technicianId || `T${t.id}`}
            </text>
            <text x={x + barW / 2} y={h + 26} textAnchor="middle" fontSize={9} fill={lv.color}>
              {lv.icon} {lv.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Level distribution donut (SVG) ────────────────────────
function LevelDonut({ savedRecords }) {
  const counts = {};
  LEVELS.forEach((l) => (counts[l.key] = 0));
  savedRecords.forEach((r) => { counts[r.levelKey] = (counts[r.levelKey] || 0) + 1; });

  const total = savedRecords.length || 1;
  const cx = 80, cy = 80, R = 60, innerR = 38;
  let startAngle = -Math.PI / 2;

  const slices = LEVELS.map((l) => {
    const frac = counts[l.key] / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const end = startAngle + sweep;
    const x2 = cx + R * Math.cos(end);
    const y2 = cy + R * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(end);
    const iy2 = cy + innerR * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const path = sweep < 0.01 ? null :
      `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
    startAngle = end;
    return { ...l, path, count: counts[l.key] };
  });

  return (
    <svg viewBox="0 0 200 170" style={{ width: "100%", maxWidth: 200 }}>
      {slices.map((s) => s.path && (
        <path key={s.key} d={s.path} fill={s.color} fillOpacity={0.85} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight="800" fill="#111827">{savedRecords.length}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#6b7280">Records</text>
      {slices.map((s, i) => (
        <g key={s.key}>
          <rect x={5} y={130 + i * 11} width={8} height={8} rx={2} fill={s.color} />
          <text x={16} y={137 + i * 11} fontSize={8} fill="#374151">
            {s.label}: {s.count}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────
// Map ML model speed label → LEVELS key
// Model predicts: "Very Fast", "Fast", "Normal", "Slow", "Very Slow"
function mlLabelToLevelKey(label) {
  if (!label) return "normal";
  const l = label.toLowerCase().trim();
  if (l === "very fast") return "excellent";     // 🏆 Best performance
  if (l === "fast") return "good";               // ✅ Good
  if (l === "normal") return "normal";           // 🟡 Average
  if (l === "slow") return "needstraining";      // 🔴 Needs Training
  if (l === "very slow") return "needstraining"; // 🔴 Needs Training
  return "normal";
}

export default function TechnicianDashboard({ token, userRole }) {
  const [view, setView] = useState("input");   // "input" | "results" | "history"
  const [forms, setForms] = useState([emptyForm(1)]);
  const [savedRecords, setSavedRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("techRecords") || "[]"); }
    catch { return []; }
  });
  const [results, setResults] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predError, setPredError] = useState("");

  useEffect(() => {
    localStorage.setItem("techRecords", JSON.stringify(savedRecords));
  }, [savedRecords]);

  const update = (idx, key, val) => {
    setForms((prev) => {
      const next = [...prev];
      const f = { ...next[idx], [key]: val };
      if (key === "serviceType") f.expectedTime = EXPECTED_TIMES[val] ?? "";
      next[idx] = f;
      return next;
    });
    setResults(null);
  };

  const addTechnician = () => {
    if (forms.length < TECH_COLORS.length) {
      setForms((prev) => [...prev, emptyForm(prev.length + 1)]);
    }
  };

  const removeTechnician = (idx) => {
    setForms((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((f, i) => ({ ...f, id: i + 1 }));
    });
    setResults(null);
  };

  const allFilled = forms.every((f) =>
    f.technicianId && f.centerId && f.vehicleType && f.serviceType &&
    f.month && f.experience && f.jobCount &&
    f.workSuccessRate !== "" && f.customerRating !== "" &&
    f.expectedTime && f.actualTime && Number(f.actualTime) > 0
  );

  const predict = async () => {
    setPredicting(true);
    setPredError("");

    try {
      // Call backend ML API for each technician in parallel
      const mlResults = await Promise.all(
        forms.map(async (f) => {
          const monthNumber = MONTHS.indexOf(f.month) + 1;
          const payload = {
            center_id: f.centerId || "SC001",      // SC001-SC005 (model trained)
            technician_id: f.technicianId,          // tec_01, tec_02, tec_03
            vehicle_type: f.vehicleType,            // "Car" | "Van" | "Cab"
            service_type: f.serviceType,            // "Body Wash" | "Full Body" | "Interior"
            month: monthNumber,                     // 1–12
            experience_years: Number(f.experience),
            job_count: Number(f.jobCount),
            work_success_rate: Number(f.workSuccessRate),
            customer_rating: Number(f.customerRating),
            expected_time_hrs: Number(f.expectedTime)
          };

          try {
            // Real ML model call via backend → Python predict.py
            const response = await callPredictAPI(payload, token);
            const mlLabel = response.predicted_performance_level;  // "Fast", "Normal", etc.
            const levelKey = mlLabelToLevelKey(mlLabel);
            const lv = LEVELS.find((l) => l.key === levelKey) || LEVELS[2];

            // Compute local score for charts (visual only)
            const sr = Number(f.expectedTime) / Number(f.actualTime);
            const score = scoreOf(sr, Number(f.workSuccessRate), Number(f.customerRating), Number(f.experience));

            return { sr, score, lv, mlLabel, usedML: true };
          } catch (apiErr) {
            console.warn("ML API failed for", f.technicianId, apiErr.message);
            // Fallback: local formula if API fails
            const sr = Number(f.expectedTime) / Number(f.actualTime);
            const score = scoreOf(sr, Number(f.workSuccessRate), Number(f.customerRating), Number(f.experience));
            const lv = levelOf(score);
            return { sr, score, lv, mlLabel: lv.label, usedML: false };
          }
        })
      );

      const bestIdx = mlResults.reduce((bi, r, i) => r.score > mlResults[bi].score ? i : bi, 0);
      const timestamp = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

      const newRecords = forms.map((f, i) => ({
        id: Date.now() + i,
        timestamp,
        technicianId: f.technicianId,
        vehicleType: f.vehicleType,
        serviceType: SERVICE_DISPLAY[f.serviceType] || f.serviceType,
        month: f.month,
        experience: f.experience,
        score: mlResults[i].score,
        levelKey: mlResults[i].lv.key,
        levelLabel: mlResults[i].lv.label,
        levelColor: mlResults[i].lv.color,
        levelIcon: mlResults[i].lv.icon,
        mlLabel: mlResults[i].mlLabel,
        usedML: mlResults[i].usedML,
        isBest: i === bestIdx,
        sr: +mlResults[i].sr.toFixed(3),
        successRate: f.workSuccessRate,
        customerRating: f.customerRating,
      }));

      setSavedRecords((prev) => [...prev, ...newRecords]);
      setResults({ res: mlResults, bestIdx });
      setView("results");
    } catch (err) {
      setPredError("Prediction failed: " + err.message);
    } finally {
      setPredicting(false);
    }
  };

  const clearHistory = () => { setSavedRecords([]); };

  const downloadPDF = (records, filename) => {
    if (!records || !records.length) return;
    const doc = new jsPDF("landscape");

    // Professional Header
    doc.setFillColor(16, 185, 129); // Emerald color
    doc.rect(0, 0, 300, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SmartService ML - Technician Performance Report", 14, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}  |  Total Records: ${records.length}`, 14, 20);
    doc.setTextColor(0, 0, 0);

    const headers = [["Technician", "Service", "Vehicle", "Score", "Level", "Speed", "Success %", "Rating", "Experience", "Month", "Date"]];
    const rows = records.map(r => [
      r.technicianId || `T${r.id}`, r.serviceType, r.vehicleType, r.score, r.levelLabel,
      r.sr, r.successRate, r.customerRating, r.experience || '', r.month || '', r.timestamp
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 32,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, textColor: [55, 65, 81] },
      headStyles: { fillColor: [6, 78, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });

    doc.save(filename);
  };

  // ── Render ─────────────────────────────────────────────
  const navBtn = (id, label) => (
    <button onClick={() => setView(id)} className={`nav-btn ${view === id ? "active" : ""}`} style={{
      padding: "8px 20px", borderRadius: 8,
      border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
      background: view === id ? "#111827" : "transparent",
      color: view === id ? "#fff" : "#6b7280",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <style>{`
        .glass-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .glass-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.06) !important; }
        .add-tech-card { transition: all 0.3s ease; }
        .add-tech-card:hover { border-color: #3b82f6 !important; background: rgba(255,255,255,0.9) !important; transform: translateY(-4px); box-shadow: 0 12px 30px rgba(59,130,246,0.15) !important; }
        .premium-btn { transition: all 0.3s ease; }
        .premium-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(245, 158, 11, 0.35) !important; }
        .nav-btn { transition: all 0.2s ease; }
        .nav-btn:hover:not(.active) { background: #e5e7eb !important; color: #111827 !important; }
        .fade-in { animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        .input-focus { transition: all 0.2s ease; }
        .input-focus:focus-within { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); border-color: #3b82f6 !important; }
        
        /* Custom scrollbar for horizontal scrolling */
        ::-webkit-scrollbar { height: 10px; width: 10px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; margin: 0 20px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Top Nav ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 54 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#111827", marginRight: 16 }}>
          ⚙️ SmartService ML
        </div>
        {navBtn("input", "📝 Enter Data")}
        {navBtn("results", "📊 Results")}
        {navBtn("history", `🗂 History (${savedRecords.length})`)}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* ══════════════════════════════════════════
            VIEW: INPUT
        ══════════════════════════════════════════ */}
        {view === "input" && (
          <div className="fade-in">
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <h2 style={{ margin: "0 0 4px 0", fontSize: 24, fontWeight: 800, color: "#111827" }}>Technician Performance Entry</h2>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>Fill in all fields for all technicians, then predict</p>
            </div>

            <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: 24, paddingBottom: 24, marginBottom: 24, justifyContent: forms.length < 3 ? "center" : "flex-start" }}>
              {forms.map((f, idx) => (
                <div key={idx} className="glass-card" style={{ flex: "1 0 340px", maxWidth: 500, background: "#fff", borderRadius: 16, border: `1.5px solid ${TECH_COLORS[idx]}40`, overflow: "hidden", boxShadow: `0 8px 24px ${TECH_COLORS[idx]}15` }}>
                  <div style={{ padding: "12px 18px", background: `linear-gradient(135deg, ${TECH_COLORS[idx]}, ${TECH_COLORS[idx]}dd)`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.25)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, backdropFilter: "blur(4px)" }}>T{f.id}</div>
                      <div style={{ fontWeight: 800, color: "#fff", fontSize: 16, letterSpacing: "0.5px" }}>Technician {f.id}</div>
                    </div>
                    {forms.length > 1 && (
                      <button onClick={() => removeTechnician(idx)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px 8px", fontSize: 18, fontWeight: 800, opacity: 0.8 }} title="Remove this technician">✕</button>
                    )}
                  </div>
                  <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                      <div><Label>Technician ID</Label><Select value={f.technicianId} onChange={(e) => update(idx, "technicianId", e.target.value)} options={TECHNICIAN_IDS} placeholder="Select Technician" /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                      <div><Label>Service Center</Label><Select value={f.centerId || ""} onChange={(e) => update(idx, "centerId", e.target.value)} options={CENTER_IDS} placeholder="Select Center" /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Vehicle Type</Label><Select value={f.vehicleType} onChange={(e) => update(idx, "vehicleType", e.target.value)} options={VEHICLE_TYPES} placeholder="Select vehicle" /></div>
                      <div><Label>Service Type</Label><Select value={f.serviceType} onChange={(e) => update(idx, "serviceType", e.target.value)} options={SERVICE_TYPES} placeholder="Select service" /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Month</Label><Select value={f.month} onChange={(e) => update(idx, "month", e.target.value)} options={MONTHS} placeholder="Select month" /></div>
                      <div><Label>Experience (yrs)</Label><Input type="number" placeholder="e.g. 5" min={1} max={30} value={f.experience} onChange={(e) => update(idx, "experience", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Job Count</Label><Input type="number" placeholder="e.g. 30" min={0} value={f.jobCount} onChange={(e) => update(idx, "jobCount", e.target.value)} /></div>
                      <div><Label>Success Rate (%)</Label><Input type="number" placeholder="0–100" min={0} max={100} value={f.workSuccessRate} onChange={(e) => update(idx, "workSuccessRate", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Customer Rating (1–5)</Label><Input type="number" placeholder="1–5" min={1} max={5} value={f.customerRating} onChange={(e) => update(idx, "customerRating", e.target.value)} /></div>
                      <div><Label>Expected Time (hrs)</Label><Input type="number" placeholder="auto-filled" min={0.1} step={0.5} value={f.expectedTime} onChange={(e) => update(idx, "expectedTime", e.target.value)} /></div>
                    </div>

                    <div>
                      <Label>⏱ Actual Time (hrs) *</Label>
                      <Input type="number" placeholder="e.g. 0.8" min={0.1} step={0.1} value={f.actualTime} onChange={(e) => update(idx, "actualTime", e.target.value)} accent={TECH_COLORS[idx]} />
                    </div>

                  </div>
                </div>
              ))}
              
              {forms.length < TECH_COLORS.length && (
                <div onClick={addTechnician} className="add-tech-card" style={{ flex: "1 0 340px", maxWidth: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed #94a3b8", borderRadius: 16, cursor: "pointer", background: "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))", backdropFilter: "blur(10px)", minHeight: 200 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2dd4bf)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 16, boxShadow: "0 8px 20px rgba(59,130,246,0.3)" }}>+</div>
                  <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 18 }}>Add Technician</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 600 }}>Compare {forms.length + 1} technicians side-by-side</div>
                </div>
              )}
            </div>

            {predError && (
              <div style={{ maxWidth: 460, margin: "0 auto 12px", padding: "10px 16px", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                ⚠️ {predError}
              </div>
            )}
            <button className="premium-btn" onClick={predict} disabled={!allFilled || predicting} style={{
              display: "block", width: "100%", maxWidth: 460, margin: "0 auto",
              padding: "16px 0", borderRadius: 12, border: "none",
              background: allFilled && !predicting ? "linear-gradient(135deg,#f59e0b,#ea580c)" : "#d1d5db",
              color: "#fff", fontSize: 16, fontWeight: 800,
              cursor: allFilled && !predicting ? "pointer" : "not-allowed",
              boxShadow: allFilled && !predicting ? "0 6px 16px rgba(249,115,22,.2)" : "none",
            }}>
              {predicting ? "🔄 Running ML Model..." : allFilled ? "🤖 Predict with ML Model" : "Fill in all fields for all technicians"}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: RESULTS
        ══════════════════════════════════════════ */}
        {view === "results" && results && (
          <div className="fade-in">
            {/* Winner banner */}
            <div className="glass-card" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)", borderRadius: 16, padding: "20px 28px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, boxShadow: "0 10px 25px rgba(6,78,59,0.2)" }}>
              <div>
                <div style={{ fontSize: 12, color: "#6ee7b7", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Best Technician This Session</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
                  🏆 {forms[results.bestIdx].technicianId || `Technician ${results.bestIdx + 1}`}
                  <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 14, color: "#a7f3d0", background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: 99 }}>
                    {results.res[results.bestIdx].usedML ? "🤖 ML:" : "📐 Formula:"} {results.res[results.bestIdx].lv.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#6ee7b7", marginTop: 6, opacity: 0.85 }}>
                  {results.res[results.bestIdx].usedML ? "✅ Powered by trained ML model (predict.py)" : "⚠️ ML API unavailable — used local formula"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <button onClick={() => downloadPDF(savedRecords.slice(-forms.length), "current_results.pdf")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #10b981", background: "rgba(16, 185, 129, 0.2)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  ⬇️ Download PDF
                </button>
                <div style={{ background: "#10b981", borderRadius: 10, padding: "10px 18px", textAlign: "center", color: "#fff" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, opacity: .8 }}>Performance Score</div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{results.res[results.bestIdx].score}</div>
                  <div style={{ fontSize: 10, opacity: .8 }}>out of 100</div>
                </div>
              </div>
            </div>

            {/* 3 result cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginBottom: 28 }}>
              {forms.map((f, i) => {
                const { score, lv, sr } = results.res[i];
                const isBest = i === results.bestIdx;
                const rank = [...results.res].sort((a, b) => b.score - a.score).findIndex((r) => r === results.res[i]) + 1;
                return (
                  <div key={i} className="glass-card" style={{ background: "#fff", borderRadius: 16, border: isBest ? `2px solid #10b981` : "1px solid #e5e7eb", boxShadow: isBest ? "0 8px 30px rgba(16,185,129,.2)" : "0 4px 12px rgba(0,0,0,.03)", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", background: isBest ? "linear-gradient(135deg,#d1fae5,#a7f3d0)" : "#f9fafb", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: TECH_COLORS[i], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>T{f.id}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>{f.technicianId}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{f.serviceType} · {f.vehicleType}</div>
                        </div>
                      </div>
                      <div style={{ background: rank === 1 ? "#fbbf24" : rank === 2 ? "#d1d5db" : "#f3f4f6", color: rank === 1 ? "#78350f" : "#374151", borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>#{rank}</div>
                    </div>
                    <div style={{ padding: 18 }}>
                      {/* Level badge - ML label */}
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: lv.bg, color: lv.color, borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                        {lv.icon} {lv.label}
                      </div>
                      <div style={{ fontSize: 11, color: results.res[i].usedML ? "#059669" : "#9ca3af", marginBottom: 10, fontWeight: 600 }}>
                        {results.res[i].usedML ? `🤖 ML Model: "${results.res[i].mlLabel}"` : "⚠️ Local formula (ML unavailable)"}
                      </div>
                      {/* Score bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: "#6b7280", fontWeight: 600 }}>Performance Score</span>
                          <span style={{ fontWeight: 800, color: lv.color }}>{score}/100</span>
                        </div>
                        <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${score}%`, background: lv.color, height: "100%", borderRadius: 99, transition: "width .6s" }} />
                        </div>
                      </div>
                      {/* Mini stats */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                        {[
                          ["Speed Ratio", sr.toFixed(3), sr >= 1 ? "#10b981" : "#ef4444"],
                          ["Success Rate", f.workSuccessRate + "%", "#3b82f6"],
                          ["Customer Rating", f.customerRating + "/5", "#f59e0b"],
                          ["Experience", f.experience + " yrs", "#8b5cf6"],
                        ].map(([label, val, color]) => (
                          <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                            <div style={{ color: "#9ca3af", marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 700, color }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginBottom: 28 }}>
              <div className="glass-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,.03)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 16 }}>📊 Performance Scores</div>
                <BarChart techs={forms} scores={results.res.map((r) => r.score)} />
              </div>
              <div className="glass-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,.03)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 16 }}>🕸 Skill Radar</div>
                <RadarChart techs={forms} />
              </div>
              <div className="glass-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,.03)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 16 }}>🍩 Level Distribution</div>
                <LevelDonut savedRecords={savedRecords} />
                <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center", fontWeight: 500 }}>From all saved records ({savedRecords.length} total)</div>
              </div>
            </div>

            {/* Comparison table */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 15, color: "#111827" }}>📋 Side-by-Side Comparison</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Metric</th>
                      {forms.map((f, i) => (
                        <th key={i} style={{ padding: "10px 16px", textAlign: "center", color: i === results.bestIdx ? "#10b981" : "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                          {i === results.bestIdx ? "⭐ " : ""}{f.technicianId || `T${f.id}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Performance Level", (i) => results.res[i].lv.icon + " " + results.res[i].lv.label],
                      ["Score", (i) => results.res[i].score + "/100"],
                      ["Speed Ratio", (i) => results.res[i].sr.toFixed(3)],
                      ["Actual Time (hrs)", (i) => forms[i].actualTime],
                      ["Expected Time (hrs)", (i) => forms[i].expectedTime],
                      ["Success Rate", (i) => forms[i].workSuccessRate + "%"],
                      ["Customer Rating", (i) => forms[i].customerRating + "/5"],
                      ["Experience", (i) => forms[i].experience + " yrs"],
                    ].map(([label, fn], ri) => (
                      <tr key={ri} style={{ borderTop: "1px solid #f3f4f6", background: ri % 2 ? "#fafafa" : "#fff" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "#374151" }}>{label}</td>
                        {forms.map((_, ci) => (
                          <td key={ci} style={{ padding: "10px 16px", textAlign: "center", fontWeight: ci === results.bestIdx ? 700 : 400, color: ci === results.bestIdx ? "#059669" : "#374151" }}>
                            {fn(ci)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: HISTORY
        ══════════════════════════════════════════ */}
        {view === "history" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 24, fontWeight: 800, color: "#111827" }}>📂 Saved Records</h2>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{savedRecords.length} total entries saved</p>
              </div>
              {savedRecords.length > 0 && (
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => downloadPDF(savedRecords, "all_records_history.pdf")} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #10b981", background: "#fff", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    ⬇️ Download PDF
                  </button>
                  <button onClick={clearHistory} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    🗑 Clear All
                  </button>
                </div>
              )}
            </div>

            {savedRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 600 }}>No records yet. Predict some technicians first!</div>
              </div>
            ) : (
              <>
                {/* Charts for history */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
                  {/* Level counts */}
                  {LEVELS.map((l) => {
                    const cnt = savedRecords.filter((r) => r.levelKey === l.key).length;
                    return (
                      <div key={l.key} style={{ background: l.bg, borderRadius: 12, padding: "16px 18px", border: `1.5px solid ${l.color}30` }}>
                        <div style={{ fontSize: 22 }}>{l.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: l.color, marginTop: 4 }}>{cnt}</div>
                        <div style={{ fontSize: 12, color: l.color, fontWeight: 600 }}>{l.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Best overall */}
                {(() => {
                  const best = [...savedRecords].sort((a, b) => b.score - a.score)[0];
                  return (
                    <div style={{ background: "linear-gradient(135deg,#064e3b,#065f46)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 32 }}>🏆</div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>All-Time Best Technician</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{best.technicianId}</div>
                        <div style={{ fontSize: 13, color: "#a7f3d0" }}>Score {best.score}/100 · {best.levelIcon} {best.levelLabel} · {best.serviceType} · {best.timestamp}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Table */}
                <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["#", "Technician", "Service", "Vehicle", "Score", "Level", "Speed", "Success", "Rating", "Session Best", "Saved At"].map((h) => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...savedRecords].reverse().map((r, i) => (
                          <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 ? "#fafafa" : "#fff" }}>
                            <td style={{ padding: "9px 14px", color: "#9ca3af" }}>{savedRecords.length - i}</td>
                            <td style={{ padding: "9px 14px", fontWeight: 700, color: "#111827" }}>{r.technicianId}</td>
                            <td style={{ padding: "9px 14px", color: "#374151" }}>{r.serviceType}</td>
                            <td style={{ padding: "9px 14px", color: "#374151" }}>{r.vehicleType}</td>
                            <td style={{ padding: "9px 14px", fontWeight: 700, color: r.levelColor }}>{r.score}</td>
                            <td style={{ padding: "9px 14px" }}>
                              <span style={{ background: LEVELS.find((l) => l.key === r.levelKey)?.bg, color: r.levelColor, borderRadius: 6, padding: "3px 8px", fontWeight: 600, fontSize: 12 }}>
                                {r.levelIcon} {r.levelLabel}
                              </span>
                            </td>
                            <td style={{ padding: "9px 14px", color: "#374151" }}>{r.sr}</td>
                            <td style={{ padding: "9px 14px", color: "#374151" }}>{r.successRate}%</td>
                            <td style={{ padding: "9px 14px", color: "#374151" }}>{r.customerRating}/5</td>
                            <td style={{ padding: "9px 14px" }}>{r.isBest ? "⭐ Yes" : "—"}</td>
                            <td style={{ padding: "9px 14px", color: "#9ca3af", whiteSpace: "nowrap", fontSize: 11 }}>{r.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {view === "results" && !results && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 600 }}>No results yet. Go to Enter Data and predict first.</div>
            <button onClick={() => setView("input")} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Go to Enter Data →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
