import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../services/api';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadNotifications() {
    try {
      if (!token) return;
      const data = await getNotifications(token);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [token]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotifications();
  }

  async function handleMarkAsRead(item) {
    if (item.read) return;
    try {
      const updated = await markNotificationAsRead(item.id || item._id, token);
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id) === (item.id || item._id) ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function handleMarkAllRead() {
    try {
      setActionLoading(true);
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'service_completed':
        return '🚗';
      case 'appointment_reminder':
        return '⏰';
      case 'appointment_confirmed':
        return '✅';
      case 'offer':
        return '🎁';
      default:
        return '🔔';
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <Pressable
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            disabled={actionLoading}
          >
            <Text style={styles.markAllText}>
              {actionLoading ? 'Updating...' : 'Mark all read'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF5722" />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptyDesc}>
              Service completion alerts, appointment reminders, and status updates will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.read && styles.unreadCard]}
            onPress={() => handleMarkAsRead(item)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
              </View>

              <View style={styles.cardTitleContainer}>
                <Text style={[styles.cardTitle, !item.read && styles.unreadText]}>
                  {item.title || 'Notification'}
                </Text>
                <Text style={styles.cardTime}>{formatDate(item.createdAt)}</Text>
              </View>

              {!item.read && <View style={styles.unreadDot} />}
            </View>

            <Text style={styles.cardMessage}>{item.message}</Text>

            {item.data?.nextServiceDate ? (
              <View style={styles.badgeBox}>
                <Text style={styles.badgeText}>
                  📅 Next Service: {item.data.nextServiceDate}
                  {item.data.nextServiceMileage ? ` (${Number(item.data.nextServiceMileage).toLocaleString()} km)` : ''}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 14
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  markAllButton: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECDD3'
  },
  markAllText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600'
  },
  listContent: {
    padding: 14
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  unreadCard: {
    backgroundColor: '#FFFBF5',
    borderColor: '#FED7AA',
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  iconText: {
    fontSize: 18
  },
  cardTitleContainer: {
    flex: 1
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#0F172A'
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
    marginLeft: 6
  },
  cardMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18
  },
  badgeBox: {
    marginTop: 10,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  badgeText: {
    fontSize: 11,
    color: '#C2410C',
    fontWeight: '600'
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260
  }
});
