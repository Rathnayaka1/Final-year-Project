import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getLoyaltySummary, redeemLoyaltyPoints } from '../services/api';

export default function LoyaltyScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState({ loyaltyPoints: 0, transactions: [] });
  const [usePointsInput, setUsePointsInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSummary = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getLoyaltySummary(token);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load loyalty points');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [token]);

  const handleUsePoints = async () => {
    const points = Number(usePointsInput);
    if (!Number.isFinite(points) || points <= 0) {
      setError('Enter a valid positive number of points to use.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const data = await redeemLoyaltyPoints(points, token, 'Redeemed from mobile app');
      setSummary(data);
      setUsePointsInput('');
      setSuccess('Points redeemed successfully.');
    } catch (err) {
      setError(err.message || 'Unable to redeem points');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D82" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>Available Loyalty Points</Text>
        <Text style={styles.pointsValue}>{summary.loyaltyPoints || 0}</Text>
        <Text style={styles.pointsHint}>
          Points are added automatically after successful service completion.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Use Points</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={usePointsInput}
          onChangeText={setUsePointsInput}
          placeholder="Enter points to use"
          placeholderTextColor="#9CA3AF"
        />
        <Pressable style={styles.secondaryButton} onPress={handleUsePoints} disabled={submitting}>
          <Text style={styles.secondaryButtonText}>{submitting ? 'Processing...' : 'Redeem Points'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {summary.transactions?.length ? (
          summary.transactions.map((tx) => (
            <View key={`${tx.createdAt}-${tx.points}-${tx.type}`} style={styles.txRow}>
              <View>
                <Text style={styles.txType}>{tx.type === 'earn' ? 'Added Points' : 'Redeemed Points'}</Text>
                <Text style={styles.txNote}>{tx.note || 'No note'}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txPoints, tx.type === 'earn' ? styles.earn : styles.redeem]}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.points}
                </Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No loyalty transactions yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 32
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  pointsCard: {
    backgroundColor: '#003D82',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center'
  },
  pointsLabel: {
    color: '#BFDBFE',
    fontSize: 14,
    marginBottom: 6
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '700'
  },
  pointsHint: {
    color: '#BFDBFE',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 10
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700'
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1F2937',
    backgroundColor: '#FFFFFF'
  },
  primaryButton: {
    backgroundColor: '#FFA500',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#E3F2FD',
    borderColor: '#003D82',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#003D82',
    fontWeight: '700'
  },
  error: {
    color: '#DC2626',
    fontWeight: '600'
  },
  success: {
    color: '#16A34A',
    fontWeight: '600'
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10
  },
  txType: {
    color: '#111827',
    fontWeight: '600'
  },
  txNote: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2
  },
  txRight: {
    alignItems: 'flex-end'
  },
  txPoints: {
    fontSize: 16,
    fontWeight: '700'
  },
  earn: {
    color: '#16A34A'
  },
  redeem: {
    color: '#DC2626'
  },
  txDate: {
    color: '#94A3B8',
    fontSize: 12
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 8
  }
});
