import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getActiveAppointment, getNearbyServiceCenters, getNextServiceReminder, getUnreadNotificationCount } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [nearestCenter, setNearestCenter] = useState(null);
  const [serviceReminder, setServiceReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadDashboardData() {
    try {
      const [appointment, centers, reminder] = await Promise.all([
        getActiveAppointment(token).catch(() => null),
        getNearbyServiceCenters(6.9271, 79.8612, 25000).catch(() => []),
        getNextServiceReminder(token).catch(() => null)
      ]);

      setActiveAppointment(appointment);
      setNearestCenter(centers?.[0] || null);
      setServiceReminder(reminder);
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

  // Refresh unread count when screen is focused
  useFocusEffect(
    useCallback(() => {
      async function fetchUnread() {
        try {
          const count = await getUnreadNotificationCount(token);
          setUnreadCount(count || 0);
        } catch (e) {
          // silently ignore
        }
      }
      fetchUnread();
    }, [token])
  );

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
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Guest'}</Text>
          <Text style={styles.subtitle}>Let's keep your vehicle in top shape</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={24} color="#1F2937" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
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

      {!activeAppointment && (
        serviceReminder?.nextServiceDate ? (
          <View style={styles.promoCard}>
            <View style={styles.badgeRow}>
              <Text style={styles.promoBadge}>🔧 Maintenance Reminder</Text>
              {serviceReminder.serviceName ? (
                <Text style={styles.promoSubBadge}>{serviceReminder.serviceName}</Text>
              ) : null}
            </View>
            <Text style={styles.promoTitle}>Next Service Due Soon</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Recommended Date</Text>
                <Text style={styles.detailValue}>📅 {serviceReminder.nextServiceDate}</Text>
              </View>
              {serviceReminder.nextServiceMileage > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Target Mileage</Text>
                  <Text style={styles.detailValue}>
                    🛣️ {Number(serviceReminder.nextServiceMileage).toLocaleString()} km
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              style={styles.cardActionButton}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.cardActionButtonText}>Book Service Appointment</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.promoCard}>
            <Text style={styles.promoBadge}>🚗 Welcome</Text>
            <Text style={styles.promoTitle}>Smart Vehicle Care</Text>
            <Text style={styles.promoText}>
              Keep your vehicle in top condition. Book your periodic service to activate automated maintenance tracking & reminders.
            </Text>
            <Pressable
              style={styles.cardActionButton}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.cardActionButtonText}>Book First Service</Text>
            </Pressable>
          </View>
        )
      )}

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
    paddingTop: (StatusBar.currentHeight || 44) + 12,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  bellButton: {
    padding: 8,
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
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
  promoCard: {
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  promoBadge: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  promoSubBadge: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '500'
  },
  promoTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6
  },
  promoText: {
    fontSize: 14,
    color: '#DBEAFE',
    lineHeight: 20,
    marginBottom: 14
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 14
  },
  detailItem: {
    flex: 1
  },
  detailLabel: {
    fontSize: 11,
    color: '#BFDBFE',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  cardActionButton: {
    backgroundColor: '#FFA500',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2
  },
  cardActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
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
