import React, { useEffect, useRef, useState } from 'react';
import { fetchInventoryForecastConfig, runInventoryForecast } from '../services/api';
import './InventoryForecast.css';

const units={litre:'litres',piece:'pieces',axle_set:'axle sets',pair:'pairs',can:'cans'};
const fmt=n=>new Intl.NumberFormat('en-LK',{maximumFractionDigits:2}).format(n);
const addDays=(iso,n)=>{if(!iso)return '';const d=new Date(`${iso}T00:00:00Z`);if(Number.isNaN(d.getTime()))return '';d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const label=iso=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`));
const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Colombo'}).formatToParts(new Date());return `${p.find(x=>x.type==='year').value}-${p.find(x=>x.type==='month').value}-${p.find(x=>x.type==='day').value}`;};
function Chart({rows,unit}) {
  const w=900,h=290,left=62,right=24,top=22,bottom=50;
  const max=Math.max(1,...rows.map(r=>r.upper_qty))*1.1;
  const x=i=>left+i*(w-left-right)/Math.max(1,rows.length-1), y=v=>h-bottom-v*(h-top-bottom)/max;
  const line=(key)=>rows.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r[key])}`).join(' ');
  const band=rows.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r.upper_qty)}`).join(' ')+rows.slice().reverse().map((r,j)=>` L${x(rows.length-1-j)},${y(r.lower_qty)}`).join(' ')+' Z';
  const ticks=[...new Set([0,1,2,3,4].map(n=>Math.round((rows.length-1)*n/4)))];
  return <div className="forecast-chart"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Daily expected demand from ${rows[0].date} to ${rows.at(-1).date}, in ${unit}`}>
    {[0,1,2,3,4].map(n=><g key={n}><line x1={left} x2={w-right} y1={y(max*n/4)} y2={y(max*n/4)} stroke="#e2e8f0"/><text x={left-10} y={y(max*n/4)+4} textAnchor="end" fill="#64748b" fontSize="12">{fmt(max*n/4)}</text></g>)}
    <path d={band} fill="#003D82" opacity=".09"/><path d={line('predicted_qty')} fill="none" stroke="#FF5722" strokeWidth="2.6"/>
    {rows.map((r,i)=><circle key={r.date} cx={x(i)} cy={y(r.predicted_qty)} r={rows.length<65?3:1.5} fill="#FF5722"><title>{`${r.date}: ${fmt(r.predicted_qty)} ${unit}; open ${r.planned_open_hours} hours${r.holiday_name?'; '+r.holiday_name:''}`}</title></circle>)}
    {ticks.map(i=><text key={i} x={x(i)} y={h-20} textAnchor="middle" fill="#64748b" fontSize="12">{label(rows[i].date)}</text>)}
  </svg></div>;
}

export default function InventoryForecast({stocks,token,initialStockId,onUpdate}) {
  const stocksRef=useRef(stocks);stocksRef.current=stocks;
  const [config,setConfig]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
  const [form,setForm]=useState(null),[overrides,setOverrides]=useState([]),[detail,setDetail]=useState(false);
  useEffect(()=>{let keep=true;fetchInventoryForecastConfig(token).then(c=>{
    if(!keep)return;setConfig(c);const selected=stocksRef.current.find(s=>s.id===initialStockId)||stocksRef.current.find(s=>s.forecastItemId==='EO020')||stocksRef.current[0];
    const start=today()>c.min_date?today():c.min_date;
    setForm({stockId:selected?.id||'',itemId:selected?.forecastItemId||'EO020',start,end:addDays(start,29),stock:selected?.quantity??0,outstanding:0,receiptQty:0,receiptDate:start,buffer:3,factor:100,hours:c.default_opening_hours,holidayHours:5});
  }).catch(e=>keep&&setError(e.message));return()=>{keep=false;};},[token]);
  const item=config?.items.find(i=>i.item_id===form?.itemId),stock=stocks.find(s=>s.id===form?.stockId);
  const signature=JSON.stringify({form,overrides});const stale=result&&result.signature!==signature;
  const change=patch=>setForm(prev=>({...prev,...patch}));
  const mapped=!stock||(stock.forecastItemId===item?.item_id&&stock.unit===item?.unit);
  const totalError=config?.metadata.locked_test;
  const itemError=config?.metadata.per_item.find(r=>r.item_id===form?.itemId);
  function selectStock(id){const s=stocks.find(s=>s.id===id);change({stockId:id,itemId:s?.forecastItemId||form.itemId,stock:s?.quantity??0});setResult(null);}
  async function generate(event){event.preventDefault();if(busy)return;setError('');
    const request={item_id:form.itemId,start_date:form.start,end_date:form.end,stock_qty:Number(form.stock),on_order_qty:Number(form.outstanding),buffer_days:Number(form.buffer),demand_factor:Number(form.factor)/100,opening_hours:form.hours.map(Number),holiday_hours:Number(form.holidayHours),receipts:Number(form.receiptQty)>0?[{date:form.receiptDate,quantity:Number(form.receiptQty)}]:[],overrides:overrides.map(o=>({date:o.date,planned_open_hours:Number(o.hours),is_public_holiday:Number(o.holiday),travel_window_proxy:Number(o.travel),wet_season_proxy:Number(o.wet)}))};
    if(stock)request.stock_id=stock.id;
    const captured=signature;setBusy(true);try{const r=await runInventoryForecast(request,token);setResult({...r,signature:captured});}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function exportCSV(){if(!result||stale)return;const columns=['date','item_id','unit','predicted_qty','lower_qty','upper_qty','planned_open_hours','is_public_holiday','holiday_name','travel_window_proxy','pre_new_year_window','wet_season_proxy','confirmed_receipt_qty','net_balance_qty','source','history_through','demand_factor'];
    const cell=v=>`"${String(v??'').replaceAll('"','""')}"`;
    const lines=[columns.join(','),...result.daily.map(r=>columns.map(k=>cell(({...r,item_id:result.item_id,unit:result.unit,history_through:result.history_through,demand_factor:result.assumptions.demand_factor})[k])).join(','))];
    const url=URL.createObjectURL(new Blob(['\uFEFF',lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`inventory-${result.item_id}-${result.start_date}-${result.end_date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  if(!form||!config)return <div className="card"><h2>Inventory demand forecast</h2><p role="status">{error||'Loading the inventory model…'}</p><button className="ghost" onClick={()=>window.location.reload()}>Retry</button></div>;
  return <section className="inventory-forecast">
    <div className="card forecast-intro"><div className="card-header"><div><h2>📈 Inventory Demand Forecast</h2><p className="muted">Choose your dates, set your stock plan and forecast daily demand.</p></div><span className="status-badge status-info">{config.metadata.model_name}</span></div>
      <p className="forecast-disclosure">Simulation model · Demand history through <strong>{config.history_through}</strong>. Future points are estimates from each date’s calendar and your inputs. Current inventory quantities do not make the training history current.</p>
    </div>
    <div className="forecast-workspace">
      <form className="card forecast-inputs" onSubmit={generate}>
        <h3>1. Choose an item and period</h3>
        <label>Inventory part<select value={form.stockId} onChange={e=>selectStock(e.target.value)}><option value="">Model example — manual scenario</option>{stocks.map(s=><option key={s.id} value={s.id}>{s.partName} · {s.partNumber}</option>)}</select></label>
        <label>Compatible model item<select value={form.itemId} onChange={e=>change({itemId:e.target.value})}>{config.items.map(i=><option key={i.item_id} value={i.item_id}>{i.item_name} ({units[i.unit]})</option>)}</select></label>
        <p className="forecast-help">{item?.fitment_family} · All quantities below use <strong>{units[item?.unit]}</strong>.</p>
        {!mapped&&<div className="forecast-warning"><p>Confirm this part uses the selected specification and quantity unit before saving its model mapping. Convert bottle quantities to litres first.</p><button type="button" className="ghost small" onClick={()=>onUpdate(stock.id,{forecastItemId:item.item_id,unit:item.unit},()=>{})}>Save model mapping and unit</button></div>}
        {stock?.dataOrigin==='synthetic_demo'&&<p className="forecast-help">This inventory record is a labelled simulation example.</p>}
        <div className="form-grid"><label>From date<input type="date" min={config.min_date} value={form.start} onInput={e=>change({start:e.target.value,end:form.end<e.target.value?addDays(e.target.value,29):form.end,receiptDate:e.target.value})} required/></label><label>To date<input type="date" min={form.start} max={addDays(form.start,365)} value={form.end} onInput={e=>change({end:e.target.value})} required/></label></div>
        <h3>2. Set your stock plan</h3>
        <div className="form-grid"><label>Stock at start of period<input type="number" min="0" step={item?.unit==='litre'?'.01':'1'} value={form.stock} onChange={e=>change({stock:e.target.value})} required/></label><label>Outstanding orders<input type="number" min="0" step={item?.unit==='litre'?'.01':'1'} value={form.outstanding} onChange={e=>change({outstanding:e.target.value})} required/></label></div>
        {stock&&<p className="forecast-help">Inventory snapshot: {fmt(stock.quantity)} {units[stock.unit]||'unit not set'}. For later dates, enter stock expected at the selected start date.</p>}
        <div className="form-grid"><label>Confirmed arrival quantity<input type="number" min="0" step={item?.unit==='litre'?'.01':'1'} value={form.receiptQty} onChange={e=>change({receiptQty:e.target.value})} required/></label><label>Arrival date<input type="date" min={form.start} max={form.end} disabled={Number(form.receiptQty)<=0} value={form.receiptDate} onInput={e=>change({receiptDate:e.target.value})} required={Number(form.receiptQty)>0}/></label></div>
        <div className="form-grid"><label>Planning buffer (days)<input type="number" min="0" max="30" step="1" value={form.buffer} onChange={e=>change({buffer:e.target.value})} required/></label><label>Expected demand (% of normal)<input type="number" min="0" max="300" value={form.factor} onChange={e=>change({factor:e.target.value})} required/></label></div>
        <details><summary>Opening hours and date assumptions</summary><p className="forecast-help">Hours are used for every date in your range. Official holidays use holiday hours; 13–14 April are closed unless you override those dates. Travel and wet-season flags are calendar proxies, not observed traffic or weather.</p><div className="forecast-hours">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=><label key={d}>{d}<input aria-label={`${d} opening hours`} type="number" min="0" max="24" step=".5" value={form.hours[i]} onChange={e=>change({hours:form.hours.map((v,j)=>j===i?e.target.value:v)})} required/></label>)}</div><label>Public holiday opening hours<input type="number" min="0" max="24" step=".5" value={form.holidayHours} onChange={e=>change({holidayHours:e.target.value})} required/></label>
          <h4>Specific date overrides</h4><p className="forecast-help">Set a closure, a special holiday, travel period or wet-season assumption for an individual date.</p>
          {overrides.map((o,i)=><div className="forecast-override" key={i}><label>Date<input type="date" min={form.start} max={form.end} value={o.date} required onInput={e=>setOverrides(overrides.map((v,j)=>j===i?{...v,date:e.target.value}:v))}/></label>{[['hours','Hours',24],['holiday','Holiday',1],['travel','Travel',1],['wet','Wet season',1]].map(([key,title,max])=><label key={key}>{title}<input type="number" min="0" max={max} step={key==='hours'?'.5':'1'} value={o[key]} required onChange={e=>setOverrides(overrides.map((v,j)=>j===i?{...v,[key]:e.target.value}:v))}/></label>)}<button type="button" className="ghost small" aria-label={`Remove override ${i+1}`} onClick={()=>setOverrides(overrides.filter((_,j)=>i!==j))}>Remove</button></div>)}
          <button type="button" className="ghost small" onClick={()=>setOverrides([...overrides,{date:form.start,hours:9,holiday:0,travel:0,wet:0}])}>+ Add date override</button>
        </details>
        {error&&<p className="forecast-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy||!mapped} className="forecast-submit">{busy?'Generating forecast…':'Generate forecast'}</button><p className="forecast-help">Forecasts do not change stock or place orders.</p>
      </form>
      <div className="forecast-output">
        {!result?<div className="card forecast-placeholder"><span>📊</span><h3>Your forecast will appear here</h3><p className="muted">The graph will cover exactly the dates you choose, including dates after the dataset ends.</p></div>:<>
          <div className="card"><div className="card-header"><div><h2>{result.item_name}</h2><p className="muted">{result.start_date} – {result.end_date} · {result.days} days · {units[result.unit]}</p></div><button className="ghost small" disabled={stale} onClick={exportCSV}>Export CSV</button></div>
            {stale&&<p className="forecast-warning" role="status">Inputs changed. Generate a new forecast before using or exporting these results.</p>}
            <div className="forecast-metrics"><div><span>Expected demand</span><strong>{fmt(result.total_expected_demand)}</strong><small>{units[result.unit]} across selected dates</small></div><div><span>Suggested order</span><strong>{fmt(result.recommended_order_qty)}</strong><small>Packs of {fmt(result.order_pack_qty)} · {result.coverage_days}-day coverage policy</small></div><div><span>First projected shortage</span><strong className="forecast-date-value">{result.first_shortage_date||'None'}</strong><small>Based on start stock and dated arrivals</small></div></div>
            <p className="forecast-help">Order quantity covers supplier lead time + a seven-day review + your buffer, independently of chart length. It accounts for all outstanding orders. Expected daily quantities may be fractional for parts; period planning rounds to {fmt(result.planning_demand_qty)} {units[result.unit]}.</p>
            {result.warnings.map(w=><p className="forecast-warning" key={w}>{w}</p>)}
          </div>
          <div className="card"><div className="card-header"><div><h3>Demand across your selected dates</h3><p className="muted">Orange: expected daily demand · Shading: historical daily variation envelope</p></div></div><Chart rows={result.daily} unit={units[result.unit]}/><p className="forecast-help">{result.note}</p><button className="ghost small" onClick={()=>setDetail(v=>!v)}>{detail?'Hide':'Show'} daily values and assumptions</button>
            {detail&&<div className="table-wrapper forecast-detail-table"><table><thead><tr><th>Date</th><th>Expected demand</th><th>Open hours</th><th>Holiday</th><th>Travel / wet</th><th>Arrival</th><th>Net balance</th></tr></thead><tbody>{result.daily.map(r=><tr key={r.date}><td>{r.date}</td><td>{fmt(r.predicted_qty)}</td><td>{r.planned_open_hours}</td><td>{r.holiday_name|| (r.is_public_holiday?'User holiday':'—')}</td><td>{r.travel_window_proxy} / {r.wet_season_proxy}</td><td>{fmt(r.confirmed_receipt_qty)}</td><td style={{color:r.net_balance_qty<0?'#dc2626':undefined}}>{fmt(r.net_balance_qty)}</td></tr>)}</tbody></table></div>}
          </div>
        </>}
        <details className="card forecast-evaluation"><summary>Model evaluation and calendar sources</summary><p>Chronological test: {config.metadata.test_dates.join(' to ')}. Average per-item daily WAPE: {fmt(totalError.daily_macro_WAPE*100)}%; weekly WAPE: {fmt(totalError.weekly_macro_WAPE*100)}%. Lower is better; WAPE is an error measure, not accuracy.</p><p>Selected item: daily MAE {fmt(itemError?.MAE||0)} {units[item?.unit]} and WAPE {fmt((itemError?.WAPE||0)*100)}% on the same test dates.</p><p>Weekday baseline weekly WAPE: {fmt(config.metadata.locked_test_baseline.weekly_macro_WAPE*100)}%. Daily mean forecasts are smoother than actual usage. No random fluctuations are added to make the graph look realistic.</p><p>{config.metadata.limitation}</p><p>Official holiday years: {config.calendar_years.join(', ')}. <a href="https://www.cbsl.gov.lk/en/about/about-the-bank/bank-holidays-2026" target="_blank" rel="noreferrer">CBSL calendar</a></p></details>
      </div>
    </div>
  </section>;
}
