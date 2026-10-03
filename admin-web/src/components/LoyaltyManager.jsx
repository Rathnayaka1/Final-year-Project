import React, { useState, useMemo } from 'react';
import { earnLoyaltyPoints, redeemLoyaltyPoints } from '../services/api';

const getTier = (points) => {
  if (points >= 200) return { name: 'Platinum Member', color: '#8e44ad', bg: '#f5eef8' };
  if (points >= 100) return { name: 'Gold Member', color: '#f39c12', bg: '#fef5e7' };
  if (points >= 50) return { name: 'Silver Member', color: '#7f8c8d', bg: '#f4f6f7' };
  return { name: 'Bronze Member', color: '#d35400', bg: '#fdf2e9' };
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function LoyaltyManager({ customers = [], loading, onRefresh, token }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');

  const handleAddPoints = async (customer) => {
    const input = prompt(`Enter bill amount for ${customer.name} to add points (1000 LKR = 1 point):`);
    if (input === null) return;
    const billAmount = Number(input);
    if (!Number.isFinite(billAmount) || billAmount < 1000) {
      alert('Invalid amount. Please enter 1000 LKR or more.');
      return;
    }
    const pointsToAdd = Math.floor(billAmount / 1000);
    if (!token) return alert('No admin session token available.');
    
    try {
      await earnLoyaltyPoints(
        customer.id || customer._id,
        pointsToAdd,
        `Admin added ${pointsToAdd} points`,
        token
      );
      await onRefresh?.();
      alert(`Successfully added ${pointsToAdd} points.`);
    } catch (error) {
      alert(error.message || 'Failed to add points.');
    }
  };

  const handleRedeemPoints = async (customer) => {
    const availablePoints = Number(customer.loyaltyPoints || 0);
    if (availablePoints <= 0) return alert('This customer has 0 loyalty points to redeem.');
    const input = prompt(`Enter points to redeem for ${customer.name} (Available: ${availablePoints}):`);
    if (input === null) return;
    const pointsToRedeem = Number(input);
    if (!Number.isFinite(pointsToRedeem) || pointsToRedeem <= 0) return alert('Please enter a valid number of points.');
    if (pointsToRedeem > availablePoints) return alert(`Insufficient points! Only ${availablePoints} available.`);
    if (!token) return alert('No admin session token available.');

    try {
      await redeemLoyaltyPoints(
        customer.id || customer._id,
        pointsToRedeem,
        `Admin redeemed ${pointsToRedeem} points`,
        token
      );
      await onRefresh?.();
      alert(`Successfully redeemed ${pointsToRedeem} points.`);
    } catch (error) {
      alert(error.message || 'Failed to redeem points.');
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm);
      if (!matchSearch) return false;
      if (filterLevel === 'All') return true;
      const tierName = getTier(c.loyaltyPoints || 0).name;
      return tierName.includes(filterLevel);
    });
  }, [customers, searchTerm, filterLevel]);

  const recentTransactions = useMemo(() => {
    let all = [];
    customers.forEach(c => {
      if (c.transactions && Array.isArray(c.transactions)) {
        all = [...all, ...c.transactions];
      }
    });
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);
  }, [customers]);

  return (
    <div className="loyalty-container">
      <style>{`
        .loyalty-container {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
          align-items: start;
        }
        .loyalty-main {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.04);
        }
        .loyalty-sidebar {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.04);
          border: 1px solid #eee;
        }
        .loyalty-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .loyalty-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #2c3e50;
        }
        .filter-row {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .search-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: #3498db;
        }
        .filter-select {
          padding: 10px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
        }
        .loyalty-table {
          width: 100%;
          border-collapse: collapse;
        }
        .loyalty-table th {
          text-align: left;
          padding: 12px 16px;
          border-bottom: 2px solid #eee;
          color: #7f8c8d;
          font-weight: 600;
        }
        .loyalty-table td {
          padding: 16px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }
        .customer-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3498db;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .customer-info {
          display: flex;
          flex-direction: column;
        }
        .customer-name {
          font-weight: 600;
          color: #2c3e50;
        }
        .customer-email {
          font-size: 0.85rem;
          color: #95a5a6;
        }
        .tier-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }
        .points-val {
          font-size: 1.2rem;
          font-weight: bold;
          color: #2c3e50;
        }
        .action-btns {
          display: flex;
          gap: 8px;
        }
        .btn-add {
          background: #e3f2fd;
          color: #1976d2;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn-add:hover { background: #bbdefb; }
        .btn-redeem {
          background: #ffebee;
          color: #c62828;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn-redeem:hover:not(:disabled) { background: #ffcdd2; }
        .btn-redeem:disabled {
          background: #f5f5f5;
          color: #bdbdbd;
          cursor: not-allowed;
        }
        .tx-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 20px;
        }
        .tx-card {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #3498db;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .tx-card.redeem {
          border-left-color: #e74c3c;
        }
        .tx-card.earn {
          border-left-color: #2ecc71;
        }
        .tx-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .tx-points.earn { color: #2ecc71; }
        .tx-points.redeem { color: #e74c3c; }
        .tx-details {
          font-size: 0.85rem;
          color: #7f8c8d;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tx-date {
          font-size: 0.75rem;
          color: #bdc3c7;
          margin-top: 8px;
        }
        
        @media (max-width: 900px) {
          .loyalty-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="loyalty-main">
        <div className="loyalty-header">
          <h2>Manage Customer Loyalty</h2>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="filter-row">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="filter-select"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="Platinum">Platinum</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
          </select>
        </div>

        <table className="loyalty-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Current Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#7f8c8d' }}>
                  No customers found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(customer => {
                const points = customer.loyaltyPoints || 0;
                const tier = getTier(points);
                return (
                  <tr key={customer.id || customer._id}>
                    <td>
                      <div className="customer-cell">
                        <div className="avatar">{getInitials(customer.name)}</div>
                        <div className="customer-info">
                          <span className="customer-name">{customer.name}</span>
                          <span className="customer-email">{customer.email || 'No email'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#2c3e50', fontWeight: '500' }}>{customer.phone || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="points-val">{points}</span>
                        <span className="tier-badge" style={{ color: tier.color, background: tier.bg }}>
                          {tier.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-add" onClick={() => handleAddPoints(customer)}>
                          + Add Points
                        </button>
                        <button className="btn-redeem" onClick={() => handleRedeemPoints(customer)} disabled={points <= 0}>
                          Redeem
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="loyalty-sidebar">
        <h3 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Recent Loyalty Transactions</h3>
        {recentTransactions.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>No recent transactions.</p>
        ) : (
          <div className="tx-list">
            {recentTransactions.map(tx => (
              <div key={tx._id || Math.random()} className={`tx-card ${tx.type}`}>
                <div className="tx-header">
                  <span>{tx.type === 'earn' ? 'Points Added' : 'Points Redeemed'}</span>
                  <span className={`tx-points ${tx.type}`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.points}
                  </span>
                </div>
                <div className="tx-details">
                  <span><strong>Customer:</strong> {tx.customerName}</span>
                  <span><strong>Note:</strong> {tx.note}</span>
                </div>
                <div className="tx-date">
                  {new Date(tx.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}