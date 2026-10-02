import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getMyAppointments } from '../services/api';

export default function AppointmentsScreen({ navigation }) {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAppointments() {
    try {
      const data = await getMyAppointments(token);
      setAppointments(data || []);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAppointments();
  }

  function getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'booked': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  }

  function getStatusLabel(status) {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').toUpperCase();
  }

  function getQueueStatusLabel(queueStatus) {
    if (!queueStatus) return '';
    return queueStatus.replace(/_/g, ' ').toUpperCase();
  }

  function getStatusIcon(status) {
    switch (status?.toLowerCase()) {
      case 'booked': return '📅';
      case 'in_progress': return '🔧';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  }

  function getProgressPercentage(status, queueStatus) {
    if (status === 'completed') return 100;
    if (status === 'cancelled') return 0;
    if (status === 'in_progress') {
      if (queueStatus === 'serving') return 75;
      if (queueStatus === 'called') return 60;
      return 50;
    }
    if (status === 'booked') {
      if (queueStatus === 'called') return 40;
      return 25;
    }
    return 10;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D82" />
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#003D82" />}
      >
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Appointments Yet</Text>
        <Text style={styles.emptyText}>Your service appointments will appear here</Text>
        <Pressable style={styles.bookButton} onPress={() => navigation.navigate('Book')}>
          <Text style={styles.bookButtonText}>Book Your First Service</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#003D82" />}
    >
      <Text style={styles.header}>My Appointments</Text>
      <Text style={styles.subtitle}>{appointments.length} total</Text>

      {appointments.map((apt) => {
        const statusColor = getStatusColor(apt.status);
        const progress = getProgressPercentage(apt.status, apt.queueStatus);
        const isActive = apt.status === 'booked' || apt.status === 'in_progress';

        return (
          <View key={apt.id || apt._id} style={[styles.appointmentCard, isActive && styles.activeCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.statusIcon}>{getStatusIcon(apt.status)}</Text>
                <View>
                  <Text style={styles.serviceName}>{apt.service?.name || apt.serviceName}</Text>
                  <Text style={styles.confirmationCode}>{apt.confirmationCode}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{getStatusLabel(apt.status)}</Text>
              </View>
            </View>

            {apt.serviceCenter && (
              <View style={styles.centerInfo}>
                <Text style={styles.centerIcon}>📍</Text>
                <Text style={styles.centerName}>{apt.serviceCenter.name}</Text>
              </View>
            )}

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{apt.preferredDate}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{apt.preferredTime}</Text>
              </View>
              {apt.queueNumber && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Queue #</Text>
                  <Text style={styles.detailValue}>{apt.queueNumber}</Text>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>

            {/* Status Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, progress >= 25 && styles.timelineDotActive]} />
                <Text style={styles.timelineLabel}>Booked</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, progress >= 50 && styles.timelineDotActive]} />
                <Text style={styles.timelineLabel}>In Queue</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, progress >= 75 && styles.timelineDotActive]} />
                <Text style={styles.timelineLabel}>Servicing</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, progress >= 100 && styles.timelineDotActive]} />
                <Text style={styles.timelineLabel}>Complete</Text>
              </View>
            </View>

            {apt.queueStatus && (
              <View style={styles.queueStatusContainer}>
                <Text style={styles.queueStatusLabel}>Queue Status:</Text>
                <Text style={styles.queueStatusValue}>{getQueueStatusLabel(apt.queueStatus)}</Text>
              </View>
            )}

            {apt.vehiclesAhead !== undefined && isActive && (
              <View style={styles.vehiclesAheadContainer}>
                <Text style={styles.vehiclesAheadText}>🚗 {apt.vehiclesAhead} vehicles ahead</Text>
              </View>
            )}

            {apt.estimatedCost && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Estimated Cost:</Text>
                <Text style={styles.costValue}>Rs. {apt.estimatedCost}</Text>
              </View>
            )}
          </View>
        );
      })}
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
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24
  },
  bookButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  activeCard: {
    borderColor: '#003D82',
    borderWidth: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  statusIcon: {
    fontSize: 32
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4
  },
  confirmationCode: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  centerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B3D9F2'
  },
  centerIcon: {
    fontSize: 16
  },
  centerName: {
    fontSize: 14,
    color: '#003D82',
    fontWeight: '600'
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16
  },
  detailItem: {
    flex: 1
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 999
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    width: 40,
    textAlign: 'right'
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8
  },
  timelineItem: {
    alignItems: 'center',
    gap: 8
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#D1D5DB'
  },
  timelineDotActive: {
    backgroundColor: '#FFA500',
    borderColor: '#FFB84D'
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4
  },
  timelineLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600'
  },
  queueStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  queueStatusLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  queueStatusValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600'
  },
  vehiclesAheadContainer: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  vehiclesAheadText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600'
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  costLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  costValue: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700'
  }
});
