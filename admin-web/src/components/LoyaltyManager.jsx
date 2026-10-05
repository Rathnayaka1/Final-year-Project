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

export default function LoyaltyManager({ customers = [], loading, onRefresh }) {
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
        .points-val {
          font-size: 1.2rem;
          font-weight: bold;
          color: #2c3e50;
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
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading} style={{ background: '#f39c12', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}>
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
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#7f8c8d' }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map(customer => {
                const points = Math.max(0, Number(customer.loyaltyPoints || 0));
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
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#27ae60', fontSize: '1.05rem' }}>{points}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{txCount}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{lastActivity}</td>
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