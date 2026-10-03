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


  return (
    <div className="loyalty-container">
      <style>{`
        .loyalty-container {
          display: grid;
          grid-template-columns: 1fr;
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
        <div className="loyalty-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>Customer Loyalty Points</h2>
            <p style={{ margin: '4px 0 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>Admin visibility for customer points and activity count</p>
          </div>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading} style={{ background: '#f39c12', color: '#fff', border: 'none' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>



        <table className="loyalty-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ color: '#e67e22', borderBottom: '2px solid #ecf0f1', textAlign: 'left', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>CUSTOMER</th>
              <th style={{ padding: '12px' }}>PHONE</th>
              <th style={{ padding: '12px' }}>EMAIL</th>
              <th style={{ padding: '12px' }}>POINTS</th>
              <th style={{ padding: '12px' }}>TRANSACTIONS</th>
              <th style={{ padding: '12px' }}>LAST ACTIVITY</th>
              <th style={{ padding: '12px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#7f8c8d' }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map(customer => {
                const points = customer.loyaltyPoints || 0;
                const txCount = customer.transactionCount || customer.transactions?.length || 0;
                let lastActivity = '-';
                if (customer.lastTransactionAt) {
                  lastActivity = new Date(customer.lastTransactionAt).toLocaleDateString();
                } else if (customer.transactions?.length > 0) {
                  const lastTx = customer.transactions[customer.transactions.length - 1];
                  lastActivity = new Date(lastTx.createdAt || customer.updatedAt).toLocaleDateString();
                } else if (customer.updatedAt) {
                  lastActivity = new Date(customer.updatedAt).toLocaleDateString();
                }
                
                return (
                  <tr key={customer.id || customer._id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#34495e' }}>{customer.name}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{customer.phone || '-'}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{customer.email || 'No email'}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#27ae60' }}>{points}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{txCount}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{lastActivity}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleAddPoints(customer)}
                          style={{ background: '#f39c12', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          Add Bill
                        </button>
                        <button 
                          onClick={() => handleRedeemPoints(customer)} disabled={points <= 0}
                          style={{ background: '#f39c12', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: points <= 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold', opacity: points <= 0 ? 0.6 : 1 }}>
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


    </div>
  );
}