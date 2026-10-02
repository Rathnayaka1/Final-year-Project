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
import { getActiveAppointment, getNearbyServiceCenters } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [nearestCenter, setNearestCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboardData() {
    try {
      const [appointment, centers] = await Promise.all([
        getActiveAppointment(token).catch(() => null),
        getNearbyServiceCenters(6.9271, 79.8612, 10000).catch(() => [])
      ]);

      setActiveAppointment(appointment);
      setNearestCenter(centers?.[0] || null);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboardData();
  }

  function getQueueColor(length) {
    if (length <= 2) return '#10b981';
    if (length <= 5) return '#f59e0b';
    return '#ef4444';
  }

  function getEstimatedWait(queueLength, avgWait = 30) {
    const minutes = queueLength * avgWait;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D82" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#003D82" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Guest'}</Text>
          <Text style={styles.subtitle}>Let's keep your vehicle in top shape</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {activeAppointment && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Active Appointment</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#22c55e' }]}>
              <Text style={styles.statusText}>{activeAppointment.status}</Text>
            </View>
          </View>
          
          <Text style={styles.serviceName}>{activeAppointment.service?.name || 'Service'}</Text>
          
          {activeAppointment.serviceCenter && (
            <Text style={styles.centerName}>{activeAppointment.serviceCenter.name}</Text>
          )}

          {activeAppointment.vehiclesAhead !== undefined && (
            <View style={styles.queueInfo}>
              <Text style={styles.queueLabel}>Vehicles ahead:</Text>
              <Text style={styles.queueValue}>{activeAppointment.vehiclesAhead}</Text>
            </View>
          )}

          {activeAppointment.queueNumber && (
            <Text style={styles.queueNumber}>Queue #{activeAppointment.queueNumber}</Text>
          )}

          <Pressable
            style={styles.viewButton}
            onPress={() => navigation.navigate('Track')}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </Pressable>
        </View>
      )}

      {nearestCenter && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nearest Service Center</Text>
          
          <Text style={styles.centerNameLarge}>{nearestCenter.name}</Text>
          
          {nearestCenter.distance && (
            <Text style={styles.distance}>{(nearestCenter.distance / 1000).toFixed(1)} km away</Text>
          )}

          <View style={styles.queueStatus}>
            <View style={styles.queueRow}>
              <Text style={styles.queueLabel}>Current Queue:</Text>
              <View style={[styles.queueChip, { backgroundColor: getQueueColor(nearestCenter.currentQueueLength || 0) }]}>
                <Text style={styles.queueChipText}>{nearestCenter.currentQueueLength || 0} vehicles</Text>
              </View>
            </View>

            <View style={styles.queueRow}>
              <Text style={styles.queueLabel}>Est. Wait Time:</Text>
              <Text style={styles.queueValue}>
                {getEstimatedWait(nearestCenter.currentQueueLength || 0, nearestCenter.averageWaitTime)}
              </Text>
            </View>
          </View>

          {nearestCenter.rating && (
            <Text style={styles.rating}>⭐ {nearestCenter.rating.toFixed(1)} ({nearestCenter.totalRatings || 0} reviews)</Text>
          )}

          <Pressable
            style={styles.bookButton}
            onPress={() => navigation.navigate('Book')}
          >
            <Text style={styles.bookButtonText}>📍 Quick Book</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.offerCard}>
        <Text style={styles.offerBadge}>🎁 Limited Offer</Text>
        <Text style={styles.offerTitle}>Get 15% Off on First Service</Text>
        <Text style={styles.offerText}>Book your first appointment and enjoy exclusive discount</Text>
      </View>

      <Pressable
        style={styles.appointmentsButton}
        onPress={() => navigation.navigate('Appointments')}
      >
        <Text style={styles.appointmentsButtonText}>📋 View All Appointments</Text>
      </Pressable>

      <Pressable
        style={styles.appointmentsButton}
        onPress={() => navigation.navigate('Loyalty')}
      >
        <Text style={styles.appointmentsButtonText}>🎯 Loyalty Points</Text>
      </Pressable>

      <Pressable
        style={styles.fullBookButton}
        onPress={() => navigation.navigate('Book')}
      >
        <Text style={styles.fullBookButtonText}>Book New Service</Text>
      </Pressable>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937'
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB'
  },
  logoutText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600'
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  centerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  centerNameLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  distance: {
    fontSize: 14,
    color: '#003D82',
    fontWeight: '600',
    marginBottom: 16
  },
  queueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  queueNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  queueStatus: {
    gap: 12,
    marginBottom: 16
  },
  queueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  queueLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  queueValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  queueChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  queueChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  rating: {
    fontSize: 14,
    color: '#F59E0B',
    marginBottom: 16
  },
  viewButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#003D82'
  },
  viewButtonText: {
    color: '#003D82',
    fontSize: 14,
    fontWeight: '600'
  },
  bookButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
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
  offerCard: {
    backgroundColor: '#003D82',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#003D82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  offerBadge: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6
  },
  offerText: {
    fontSize: 14,
    color: '#FFE5DC'
  },
  appointmentsButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FFA500'
  },
  appointmentsButtonText: {
    color: '#FFA500',
    fontSize: 16,
    fontWeight: '700'
  },
  fullBookButton: {
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
  fullBookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  }
});
