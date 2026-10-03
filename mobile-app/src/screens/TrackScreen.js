import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { checkAppointmentStatus } from '../services/api';

export default function TrackScreen() {
  const [statusCode, setStatusCode] = useState('');
  const [statusResult, setStatusResult] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const placeholderColor = '#9CA3AF';

  const handleLookup = async () => {
    if (!statusCode.trim()) {
      setStatusError('Enter a confirmation code to continue.');
      return;
    }
    try {
      setCheckingStatus(true);
      setStatusError('');
      const result = await checkAppointmentStatus(statusCode.trim());
      setStatusResult(result);
    } catch (err) {
      setStatusResult(null);
      setStatusError(err.message);
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Check your appointment</Text>
        <TextInput
          placeholder="Confirmation code (e.g., APPT-0105)"
          style={styles.input}
          value={statusCode}
          onChangeText={setStatusCode}
          autoCapitalize="characters"
          placeholderTextColor={placeholderColor}
        />
        {statusError ? <Text style={styles.error}>{statusError}</Text> : null}
        {statusResult ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{statusResult.customerName}</Text>
            <Text style={styles.resultCode}>{statusResult.confirmationCode}</Text>
            <Text style={styles.resultText}>{statusResult.serviceName}</Text>
            <Text style={styles.resultText}>
              {statusResult.preferredDate} · {statusResult.preferredTime}
            </Text>
            <Text style={styles.resultText}>Status: {statusResult.status}</Text>
            <Text style={styles.resultText}>Queue: {statusResult.queueStatus}</Text>
          </View>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={handleLookup} disabled={checkingStatus}>
          <Text style={styles.primaryButtonLabel}>{checkingStatus ? 'Checking…' : 'Check status'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600'
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB'
  },
  error: {
    color: '#EF4444'
  },
  resultCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#6EE7B7'
  },
  resultTitle: {
    color: '#065F46',
    fontWeight: '600'
  },
  resultCode: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '700'
  },
  resultText: {
    color: '#1F2937'
  },
  primaryButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
