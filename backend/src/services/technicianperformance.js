const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_PATH = path.resolve(__dirname, '../../../technician-ml/predict.py');

/**
 * Fallback heuristic in case Python runtime is temporarily unreachable
 */
function heuristicFallback(tech, vehicleType = 'Car', serviceType = 'Interior') {
  const rating = Number(tech.averageRating || 4.0);
  const exp = Number(tech.experienceYears || 0);
  const jobs = Number(tech.totalJobs || 0);
  const success = Number(tech.successRate || 100);

  let score = (rating / 5) * 40 + Math.min(exp * 5, 25) + Math.min(jobs * 0.5, 20) + (success / 100) * 15;
  let level = 'MEDIUM';
  if (score >= 65 || (rating >= 4.5 && exp >= 3)) {
    level = 'HIGH';
  } else if (score < 40 || rating < 3.5) {
    level = 'LOW';
  }

  return {
    level,
    confidence: 0.8,
    probabilities: { HIGH: level === 'HIGH' ? 0.75 : 0.15, MEDIUM: level === 'MEDIUM' ? 0.7 : 0.2, LOW: level === 'LOW' ? 0.7 : 0.1 },
    source: 'fallback'
  };
}

async function predictTechnicianPerformance(technicians = [], vehicleType = 'Car', serviceType = 'Interior') {
  if (!Array.isArray(technicians) || technicians.length === 0) {
    return [];
  }

  const payload = technicians.map((tech) => ({
    vehicle_type: vehicleType,
    service_type: serviceType,
    experience_years: Number(tech.experienceYears || tech.experience_years || 0),
    job_count: Number(tech.totalJobs || tech.job_count || 0),
    work_success_rate_num: Number(tech.successRate || tech.work_success_rate_num || 100.0),
    customer_rating: Number(tech.averageRating || tech.customer_rating || 4.0),
    historical_speed_ratio: Number(tech.historicalSpeedRatio || tech.historical_speed_ratio || 1.0)
  }));

  const pythonBin = process.env.PYTHON_PATH || 'python';

  return new Promise((resolve) => {
    if (!fs.existsSync(SCRIPT_PATH)) {
      console.warn(`[AI Prediction] Script not found at ${SCRIPT_PATH}, using heuristic fallback`);
      const enriched = technicians.map((tech) => {
        const ai = heuristicFallback(tech, vehicleType, serviceType);
        return { ...tech, aiPrediction: ai };
      });
      return resolve(markTopTechnician(enriched));
    }

    const pyProcess = spawn(pythonBin, [SCRIPT_PATH, JSON.stringify(payload)], {
      windowsHide: true
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pyProcess.on('error', (err) => {
      console.warn('[AI Prediction] Process spawn error:', err.message);
      const enriched = technicians.map((tech) => ({
        ...tech,
        aiPrediction: heuristicFallback(tech, vehicleType, serviceType)
      }));
      resolve(markTopTechnician(enriched));
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.warn(`[AI Prediction] Python exited with code ${code}: ${stderrData}`);
        const enriched = technicians.map((tech) => ({
          ...tech,
          aiPrediction: heuristicFallback(tech, vehicleType, serviceType)
        }));
        return resolve(markTopTechnician(enriched));
      }

      try {
        const results = JSON.parse(stdoutData.trim());
        const arr = Array.isArray(results) ? results : [results];

        const enriched = technicians.map((tech, idx) => {
          const res = arr[idx] || {};
          const level = res.prediction || 'MEDIUM';
          return {
            ...tech,
            aiPrediction: {
              level,
              confidence: res.confidence || 0.85,
              probabilities: res.probabilities || {},
              source: 'ml_model'
            }
          };
        });

        resolve(markTopTechnician(enriched));
      } catch (parseErr) {
        console.warn('[AI Prediction] JSON parse error:', parseErr.message, stdoutData);
        const enriched = technicians.map((tech) => ({
          ...tech,
          aiPrediction: heuristicFallback(tech, vehicleType, serviceType)
        }));
        resolve(markTopTechnician(enriched));
      }
    });
  });
}

function markTopTechnician(technicians) {
  let highestScore = -1;
  let topIndex = -1;

  technicians.forEach((t, i) => {
    const ai = t.aiPrediction || {};
    const probHigh = ai.probabilities?.HIGH || (ai.level === 'HIGH' ? 0.8 : ai.level === 'MEDIUM' ? 0.5 : 0.2);
    const rating = Number(t.averageRating || 4.0);
    const score = probHigh * 0.7 + (rating / 5) * 0.3;

    if (score > highestScore) {
      highestScore = score;
      topIndex = i;
    }
  });

  return technicians.map((t, i) => {
    const ai = { ...t.aiPrediction };
    if (i === topIndex && ai.level === 'HIGH') {
      ai.isTopRecommendation = true;
    } else {
      ai.isTopRecommendation = false;
    }
    return { ...t, aiPrediction: ai };
  });
}

module.exports = {
  predictTechnicianPerformance
};
