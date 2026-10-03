import React, { useState } from 'react';

const initialState = {
  name: '',
  description: '',
  duration: 30,
  basePrice: 0
};

export default function ServiceCreator({ onCreate, loading }) {
  const [form, setForm] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate(form, () => setForm(initialState));
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <div>
          <h3>Create Service</h3>
          <p className="muted">Add services customers can book from the mobile app.</p>
        </div>
      </div>
      <label>
        Name
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>
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
      <div className="grid two-col">
        <label>
          Duration (mins)
          <input
            name="duration"
            type="number"
            min="10"
            value={form.duration}
            onChange={handleChange}
            required
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
