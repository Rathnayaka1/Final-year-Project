import React, { useState } from 'react';

const initialState = {
  name: '',
  description: '',
  durationHours: 0,
  durationMinutes: 30,
  basePrice: 0,
  vehicleType: 'All',
  serviceType: 'Body Wash'
};

export default function ServiceCreator({ onCreate, loading }) {
  const [form, setForm] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const hrs = parseInt(form.durationHours || 0, 10);
    const mins = parseInt(form.durationMinutes || 0, 10);
    const totalDuration = (hrs * 60) + mins;

    let derivedType = 'Body Wash';
    const lower = (form.name || '').toLowerCase();
    if (lower.includes('interior') || lower.includes('steam')) derivedType = 'Interior';
    else if (lower.includes('full') || lower.includes('wax') || lower.includes('hybrid') || lower.includes('lube')) derivedType = 'Full Body';

    const payload = {
      name: form.name,
      description: form.description,
      duration: totalDuration > 0 ? totalDuration : 30,
      basePrice: Number(form.basePrice) || 0,
      vehicleType: form.vehicleType || 'All',
      serviceType: derivedType
    };

    onCreate(payload, () => setForm(initialState));
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <div>
          <h3>Create Service</h3>
          <p className="muted">Add services customers can book from the mobile app.</p>
        </div>
      </div>
      <div className="grid two-col">
        <label>
          Service Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Vehicle Category
          <select name="vehicleType" value={form.vehicleType} onChange={handleChange}>
            <option value="All">🚗🚐🚖 All Vehicles</option>
            <option value="Car">🚗 Car</option>
            <option value="Van">🚐 Van</option>
            <option value="Cab">🚖 Cab</option>
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          rows="3"
          value={form.description}
          onChange={handleChange}
          placeholder="What does this service offer?"
        />
      </label>
      <div className="grid three-col">
        <label>
          Duration (Hours)
          <input
            name="durationHours"
            type="number"
            min="0"
            value={form.durationHours}
            onChange={handleChange}
          />
        </label>
        <label>
          Duration (Mins)
          <input
            name="durationMinutes"
            type="number"
            min="0"
            max="59"
            step="5"
            value={form.durationMinutes}
            onChange={handleChange}
          />
        </label>
        <label>
          Base price (Rs.)
          <input
            name="basePrice"
            type="number"
            min="0"
            value={form.basePrice}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Save service'}
      </button>
    </form>
  );
}
