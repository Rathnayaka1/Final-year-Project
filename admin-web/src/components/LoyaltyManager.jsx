import React from 'react';

// පෝට් අංකය 5001 ලෙස නිවැරදි කර ඇත
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || (import.meta.env.DEV ? '/api' : 'http://10.255.111.96:5001/api');

async function submitLoyaltyChange({ token, action, customerId, customerName, points }) {
  const endpoint = action === 'add' ? '/customers/loyalty/add' : '/customers/loyalty/use';

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      customerId,
      points,
      note: action === 'add'
        ? `Admin added ${points} points to ${customerName}`
        : `Admin redeemed ${points} points for ${customerName}`
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Loyalty request failed');
  }

  return payload;
}

// ඩේටා නොමැති විට ක්‍රෑෂ් වීම වැළැක්වීමට customers = [] ලෙස default එකක් දී ඇත
export default function LoyaltyManager({ customers = [], loading, onRefresh, token }) {
  const handleAddPoints = async (customer) => {
    const input = prompt(`Enter bill amount for ${customer.name} to add points (1000 LKR = 1 point):`);
    if (input === null) return;

    const billAmount = Number(input);
    if (!Number.isFinite(billAmount) || billAmount < 1000) {
      alert('Invalid amount. Please enter 1000 LKR or more.');
      return;
    }

    const pointsToAdd = Math.floor(billAmount / 1000);

    if (!token) {
      alert('No admin session token available. Please log in again.');
      return;
    }

    try {
      await submitLoyaltyChange({
        token,
        action: 'add',
        customerId: customer.id || customer._id,
        customerName: customer.name,
        points: pointsToAdd
      });

      await onRefresh?.();
      alert(`Successfully added ${pointsToAdd} points to ${customer.name}.`);
    } catch (error) {
      alert(error.message || 'Failed to add points. Please check backend response.');
    }
  };

  const handleRedeemPoints = async (customer) => {
    const availablePoints = Number(customer.loyaltyPoints || 0);
    if (availablePoints <= 0) {
      alert('This customer has 0 loyalty points to redeem.');
      return;
    }

    const input = prompt(`Enter points to redeem for ${customer.name} (Available: ${availablePoints}):`);
    if (input === null) return;

    const pointsToRedeem = Number(input);
    if (!Number.isFinite(pointsToRedeem) || pointsToRedeem <= 0) {
      alert('Please enter a valid number of points.');
      return;
    }

    if (pointsToRedeem > availablePoints) {
      alert(`Insufficient points! Customer only has ${availablePoints} points.`);
      return;
    }

    if (!token) {
      alert('No admin session token available. Please log in again.');
      return;
    }

    try {
      await submitLoyaltyChange({
        token,
        action: 'use',
        customerId: customer.id || customer._id,
        customerName: customer.name,
        points: pointsToRedeem
      });

      await onRefresh?.();
      alert(`Successfully redeemed ${pointsToRedeem} points for ${customer.name}.`);
    } catch (error) {
      alert(error.message || 'Failed to redeem points. Please check backend response.');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Customer Loyalty Points</h2>
          <p className="text-muted">Admin visibility for customer points and activity count</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
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
                <td colSpan={7} className="empty">No customers found.</td>
              </tr>
            )}

            {customers.map((customer) => (
              <tr key={customer.id || customer._id}>
                <td><strong>{customer.name}</strong></td>
                <td>{customer.phone || '-'}</td>
                <td className="text-muted">{customer.email || '-'}</td>
                <td>
                  <strong className="stat-value" style={{ fontSize: '1.2rem', color: (customer.loyaltyPoints || 0) > 0 ? '#2e7d32' : '#666' }}>
                    {customer.loyaltyPoints || 0}
                  </strong>
                </td>
                <td>{customer.transactionCount || 0}</td>
                <td className="text-muted">
                  {customer.lastTransactionAt ? new Date(customer.lastTransactionAt).toLocaleDateString() : '-'}
                </td>
                <td>
                  <button
                    className="btn btn-primary small"
                    onClick={() => handleAddPoints(customer)}
                    style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Add Bill
                  </button>

                  <button
                    className="btn btn-danger small"
                    onClick={() => handleRedeemPoints(customer)}
                    disabled={Number(customer.loyaltyPoints || 0) <= 0}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: Number(customer.loyaltyPoints || 0) <= 0 ? '#ccc' : '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: Number(customer.loyaltyPoints || 0) <= 0 ? 'not-allowed' : 'pointer'
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