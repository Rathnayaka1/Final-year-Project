import React from 'react';

export default function LoyaltyManager({ customers, loading, onRefresh, onUpdatePoints }) {

  const handleRedeem = (customer) => {
    // 1. පාරිභෝගිකයාගේ බිල්පතේ මුදල විමසීම
    const input = prompt(`Enter bill amount for ${customer.name} (1000 LKR = 1 Point):`);
    
    // User 'Cancel' කළහොත් නවත්වන්න
    if (input === null) return; 

    const billAmount = parseFloat(input);

    // වැරදි මුදලක් ඇතුළත් කළහොත් පරීක්ෂා කිරීම
    if (isNaN(billAmount) || billAmount < 1000) {
      alert("Invalid amount! Please enter a valid amount of 1000 LKR or more.");
      return;
    }

    // 2. ලකුණු ගණනය කිරීම (1000 ට 1 බැගින්)
    const pointsToRedeem = Math.floor(billAmount / 1000);

    // 3. පාරිභෝගිකයා සතු ලකුණු ප්‍රමාණවත් දැයි පරීක්ෂා කිරීම
    if (customer.loyaltyPoints >= pointsToRedeem) {
      if (onUpdatePoints) {
        // Parent component එකට customer ID සහ අඩු විය යුතු ලකුණු ගණන යැවීම
        onUpdatePoints(customer.id, pointsToRedeem);
      }
    } else {
      alert(`Insufficient points! This bill requires ${pointsToRedeem} points, but customer only has ${customer.loyaltyPoints}.`);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>🎯 Customer Loyalty Points</h2>
          <p className="muted">Admin visibility for customer points and activity count</p>
        </div>
        <button type="button" className="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Points</th>
              <th>Transactions</th>
              <th>Last Activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No customers found.
                </td>
              </tr>
            )}

            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <strong>{customer.name}</strong>
                </td>
                <td>{customer.phone || '—'}</td>
                <td className="muted small">{customer.email || '—'}</td>
                <td>
                  <strong className="stat-value" style={{ fontSize: '1.2rem' }}>
                    {customer.loyaltyPoints || 0}
                  </strong>
                </td>
                <td>{customer.transactionCount || 0}</td>  
                <td className="muted small">
                  {customer.lastTransactionAt
                    ? new Date(customer.lastTransactionAt).toLocaleDateString()
                    : '—'}
                </td>
                <td>
                  <button 
                    className="danger small" 
                    onClick={() => handleRedeem(customer)}
                    disabled={customer.loyaltyPoints <= 0}
                    style={{ 
                        padding: '5px 10px', 
                        backgroundColor: customer.loyaltyPoints <= 0 ? '#ccc' : '#e74c3c', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: customer.loyaltyPoints <= 0 ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    Redeem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}