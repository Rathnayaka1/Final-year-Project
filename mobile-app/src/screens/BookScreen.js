import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  TextInput,
  View,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { bookService, getServices, getNearbyServiceCenters, getServiceCenters, getAvailableTechnicians, API_BASE_URL } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const defaultVehicleLocation = {
  latitude: 6.9271,
  longitude: 79.8612
};

const initialBooking = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  vehicleType: 'Car',
  serviceId: '',
  serviceCenterId: '',
  technicianId: '',
  preferredDate: '',
  preferredTime: '',
  vehicleLocationLabel: '',
  vehicleLocationLatitude: '',
  vehicleLocationLongitude: '',
  notes: ''
};

function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function BookScreen({ navigation }) {
  const { token, user } = useAuth();
  const [services, setServices] = useState([]);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [bookingForm, setBookingForm] = useState(initialBooking);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const placeholderColor = '#9CA3AF';
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);

  // Fetch nearby service centers with tiered fallback (25km → 50km → all)
  const fetchNearbyCenters = useCallback(async (lat, lng) => {
    // Try 25km first
    let centers = await getNearbyServiceCenters(lat, lng, 25000).catch(() => []);
    // Fallback to 50km if no results
    if (!centers || centers.length === 0) {
      centers = await getNearbyServiceCenters(lat, lng, 50000).catch(() => []);
    }
    // Fallback to all centers if still no results
    if (!centers || centers.length === 0) {
      centers = await getServiceCenters().catch(() => []);
    }
    return centers;
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const lat = defaultVehicleLocation.latitude;
      const lng = defaultVehicleLocation.longitude;

      let [servicesList, centers] = await Promise.all([
        getServices().catch(() => []),
        getServiceCenters().catch(() => [])
      ]);

      if (!centers || centers.length === 0) {
        centers = await fetchNearbyCenters(lat, lng);
      }

      setServices(servicesList || []);
      setServiceCenters(centers || []);

      const selectedCenterId = centers[0]?.id || centers[0]?._id || '';
      setBookingForm((prev) => ({
        ...prev,
        customerName: prev.customerName || user?.name || '',
        customerEmail: prev.customerEmail || user?.email || '',
        customerPhone: prev.customerPhone || user?.phone || '',
        serviceId: prev.serviceId || servicesList[0]?.id,
        serviceCenterId: prev.serviceCenterId || selectedCenterId,
        vehicleLocationLatitude: prev.vehicleLocationLatitude || defaultVehicleLocation.latitude.toString(),
        vehicleLocationLongitude: prev.vehicleLocationLongitude || defaultVehicleLocation.longitude.toString()
      }));
    } catch (err) {
      setBookingError('Unable to load services right now.');
    } finally {
      setLoadingServices(false);
      setRefreshing(false);
    }
  }, [user, fetchNearbyCenters]);

  // Auto-update: reload services & service centers every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Re-fetch nearby service centers when vehicle location changes
  useEffect(() => {
    const lat = parseFloat(bookingForm.vehicleLocationLatitude);
    const lng = parseFloat(bookingForm.vehicleLocationLongitude);

    // Skip if coordinates are invalid or still at default (initial load already handled)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat === defaultVehicleLocation.latitude && lng === defaultVehicleLocation.longitude) return;

    let isMounted = true;
    async function reloadCenters() {
      setLoadingCenters(true);
      try {
        const centers = await fetchNearbyCenters(lat, lng);
        if (!isMounted) return;
        setServiceCenters(centers);

        // Auto-select first center if current selection is not in the new list
        if (centers.length > 0) {
          setBookingForm((prev) => {
            const exists = centers.some((c) => (c.id || c._id) === prev.serviceCenterId);
            return exists ? prev : { ...prev, serviceCenterId: centers[0]?.id || centers[0]?._id || '' };
          });
        }
      } catch (err) {
        console.warn('Failed to reload nearby centers:', err);
      } finally {
        if (isMounted) setLoadingCenters(false);
      }
    }

    reloadCenters();
    return () => { isMounted = false; };
  }, [bookingForm.vehicleLocationLatitude, bookingForm.vehicleLocationLongitude, fetchNearbyCenters]);

  const filteredServices = useMemo(() => {
    const centerId = bookingForm.serviceCenterId;
    const vType = bookingForm.vehicleType || 'Car';

    let list = services;
    if (centerId) {
      const match = services.filter((s) => {
        const sCenterId = s.serviceCenter?.id || s.serviceCenter?._id || s.serviceCenter;
        return !sCenterId || sCenterId === centerId;
      });
      if (match.length > 0) list = match;
    }

    const byVehicle = list.filter((s) => !s.vehicleType || s.vehicleType === 'All' || s.vehicleType === vType);
    return byVehicle.length > 0 ? byVehicle : list;
  }, [services, bookingForm.serviceCenterId, bookingForm.vehicleType]);

  useEffect(() => {
    if (!filteredServices || filteredServices.length === 0) return;

    setBookingForm((prev) => {
      const isAlreadyInFiltered = filteredServices.some((s) => (s.id || s._id) === prev.serviceId);
      if (isAlreadyInFiltered) return prev;

      const currentService = services.find((s) => (s.id || s._id) === prev.serviceId);
      if (currentService) {
        const matchByName = filteredServices.find((s) => s.name === currentService.name);
        if (matchByName) {
          return { ...prev, serviceId: matchByName.id || matchByName._id };
        }
        const matchByType = filteredServices.find((s) => s.serviceType === currentService.serviceType);
        if (matchByType) {
          return { ...prev, serviceId: matchByType.id || matchByType._id };
        }
      }

      return { ...prev, serviceId: filteredServices[0].id || filteredServices[0]._id };
    });
  }, [filteredServices, services]);

  const selectedService = useMemo(
    () => services.find((svc) => (svc.id || svc._id) === bookingForm.serviceId),
    [services, bookingForm.serviceId]
  );

  const normalizedServiceType = useMemo(() => {
    const name = (selectedService?.name || '').toLowerCase();
    if (name.includes('interior') || name.includes('sanitization') || name.includes('steam')) return 'Interior';
    if (name.includes('full') || name.includes('hybrid')) return 'Full Body';
    if (name.includes('wash')) return 'Body Wash';
    if (selectedService?.serviceType) return selectedService.serviceType;
    return 'Body Wash';
  }, [selectedService]);

  useEffect(() => {
    const centerId = bookingForm.serviceCenterId;
    if (!centerId) return;

    let isMounted = true;
    async function loadTechnicians() {
      setLoadingTechnicians(true);
      try {
        const vType = bookingForm.vehicleType || 'Car';
        const techList = await getAvailableTechnicians(centerId, token, vType, normalizedServiceType).catch(() => []);
        if (isMounted) {
          // Sort technicians: Top recommendation first, then HIGH > MEDIUM > LOW
          const sorted = [...techList].sort((a, b) => {
            if (a.aiPrediction?.isTopRecommendation && !b.aiPrediction?.isTopRecommendation) return -1;
            if (!a.aiPrediction?.isTopRecommendation && b.aiPrediction?.isTopRecommendation) return 1;
            const levelScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            const scoreA = levelScore[a.aiPrediction?.level] || 2;
            const scoreB = levelScore[b.aiPrediction?.level] || 2;
            return scoreB - scoreA;
          });

          setTechnicians(sorted);
          if (sorted.length > 0) {
            setBookingForm((prev) => {
              const exists = sorted.some((t) => (t.id || t._id) === prev.technicianId);
              return {
                ...prev,
                technicianId: exists ? prev.technicianId : (sorted[0]?.id || sorted[0]?._id || '')
              };
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load technicians:', e);
      } finally {
        if (isMounted) setLoadingTechnicians(false);
      }
    }

    loadTechnicians();
    return () => { isMounted = false; };
  }, [bookingForm.serviceCenterId, bookingForm.vehicleType, normalizedServiceType, token]);

  const handleFormChange = (field, value) => {
    setBookingForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedVehicleLocation = useMemo(() => {
    const latitude = parseFloat(bookingForm.vehicleLocationLatitude);
    const longitude = parseFloat(bookingForm.vehicleLocationLongitude);

    return {
      latitude: Number.isFinite(latitude) ? latitude : defaultVehicleLocation.latitude,
      longitude: Number.isFinite(longitude) ? longitude : defaultVehicleLocation.longitude
    };
  }, [bookingForm.vehicleLocationLatitude, bookingForm.vehicleLocationLongitude]);

  const sortedServiceCenters = useMemo(() => {
    const vLat = parseFloat(bookingForm.vehicleLocationLatitude);
    const vLng = parseFloat(bookingForm.vehicleLocationLongitude);

    return [...serviceCenters]
      .map((center) => {
        const cLat = center.location?.coordinates?.[1];
        const cLng = center.location?.coordinates?.[0];
        let distance = null;
        if (Number.isFinite(vLat) && Number.isFinite(vLng) && Number.isFinite(cLat) && Number.isFinite(cLng)) {
          distance = calculateDistanceInMeters(vLat, vLng, cLat, cLng);
        } else if (center.distance != null) {
          distance = center.distance;
        }
        return { ...center, distance };
      })
      .sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return 0;
      });
  }, [serviceCenters, bookingForm.vehicleLocationLatitude, bookingForm.vehicleLocationLongitude]);

  const handleLocationSelect = (latitude, longitude) => {
    setBookingForm((prev) => ({
      ...prev,
      vehicleLocationLatitude: latitude.toFixed(6),
      vehicleLocationLongitude: longitude.toFixed(6)
    }));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setBookingError('');

      // Dynamically require expo-location only on native platforms
      let Location = null;
      if (Platform.OS !== 'web') {
        try {
          Location = require('expo-location');
        } catch (err) {
          console.warn('expo-location not available:', err);
          Alert.alert('Location Unavailable', 'Location service is not available on this device. Please enter your location manually using the address search.');
          return null;
        }
      }

      if (!Location) {
        Alert.alert('Location Unavailable', 'Location service is not available on this platform. Please enter your location manually using the address search.');
        return null;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to capture your vehicle\'s GPS location. Please enable Location permission in your device Settings for Expo Go.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => { try { require('react-native').Linking.openSettings(); } catch (e) { } } }
          ]
        );
        return null;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      handleLocationSelect(
        currentPosition.coords.latitude,
        currentPosition.coords.longitude
      );

      Alert.alert(
        '✅ Location Captured',
        `Your vehicle location has been updated.\n\nLatitude: ${currentPosition.coords.latitude.toFixed(6)}\nLongitude: ${currentPosition.coords.longitude.toFixed(6)}\nAccuracy: ±${(currentPosition.coords.accuracy || 0).toFixed(1)} meters`
      );

      return {
        accuracy: currentPosition.coords.accuracy || 0,
        altitude: currentPosition.coords.altitude
      };
    } catch (err) {
      console.error('Location error:', err);
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please make sure:\n\n• Location/GPS is turned ON in your device settings\n• You are not indoors (GPS signal may be weak)\n\nYou can also use the "Search by address" option below.',
        [{ text: 'OK' }]
      );
      return null;
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Select date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-LK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Select date';
    }
  };

  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return 'Select time';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const min = parseInt(minutes || 0, 10);
      const meridiem = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${meridiem}`;
    } catch {
      return 'Select time';
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      const dateString = selectedDate.toISOString().split('T')[0];
      setBookingForm((prev) => ({ ...prev, preferredDate: dateString }));
    }
    setShowDatePicker(false);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (event.type === 'set' && selectedTime) {
      setTempTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setBookingForm((prev) => ({ ...prev, preferredTime: timeString }));
    }
    setShowTimePicker(false);
  };

  const handleBook = async () => {
    if (!bookingForm.serviceId) {
      setBookingError('Please select a service.');
      return;
    }

    if (!bookingForm.serviceCenterId) {
      setBookingError('Please select a service center.');
      return;
    }

    if (!bookingForm.customerName || !bookingForm.preferredDate || !bookingForm.preferredTime) {
      setBookingError('Please complete the required fields.');
      return;
    }

    if (!bookingForm.vehicleLocationLatitude || !bookingForm.vehicleLocationLongitude) {
      setBookingError('Please select your vehicle location on the map.');
      return;
    }

    try {
      setSubmitting(true);
      setBookingError('');
      const appointment = await bookService(
        {
          ...bookingForm,
          vehicleLocation: {
            label: bookingForm.vehicleLocationLabel.trim(),
            latitude: parseFloat(bookingForm.vehicleLocationLatitude),
            longitude: parseFloat(bookingForm.vehicleLocationLongitude)
          }
        },
        token
      );
      setBookingResult(appointment);
      setBookingForm((prev) => ({
        ...initialBooking,
        serviceId: prev.serviceId,
        serviceCenterId: prev.serviceCenterId,
        vehicleLocationLatitude: defaultVehicleLocation.latitude.toString(),
        vehicleLocationLongitude: defaultVehicleLocation.longitude.toString()
      }));
    } catch (err) {
      setBookingError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.card}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#003D82" colors={['#003D82']} />}
    >
      <Text style={styles.sectionTitle}>Choose a service</Text>
      {loadingServices ? (
        <ActivityIndicator color="#003D82" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceChips}>
          {filteredServices.map((service) => {
            const selected = service.id === bookingForm.serviceId;
            return (
              <Pressable
                key={service.id}
                style={[styles.serviceChip, selected && styles.serviceChipActive]}
                onPress={() => handleFormChange('serviceId', service.id)}
              >
                <Text style={[styles.serviceChipLabel, selected && styles.serviceChipLabelActive]}>
                  {service.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selectedService && (
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{selectedService.name}</Text>
          <Text style={styles.serviceDescription}>{selectedService.description}</Text>
          <Text style={styles.serviceMeta}>
            {selectedService.duration} min · Rs. {selectedService.basePrice}
          </Text>
        </View>
      )}

      {/* Vehicle Type Selection */}
      <Text style={styles.sectionTitle}>Choose Vehicle Type</Text>
      <View style={styles.vehicleTypeRow}>
        {[
          { type: 'Car', icon: '🚗', label: 'Car / Sedan' },
          { type: 'Van', icon: '🚐', label: 'Van / MPV' },
          { type: 'Cab', icon: '🚖', label: 'Cab / SUV' }
        ].map((item) => {
          const selected = (bookingForm.vehicleType || 'Car') === item.type;
          return (
            <Pressable
              key={item.type}
              style={[styles.vehicleTypeChip, selected && styles.vehicleTypeChipActive]}
              onPress={() => handleFormChange('vehicleType', item.type)}
            >
              <Text style={styles.vehicleTypeIcon}>{item.icon}</Text>
              <Text style={[styles.vehicleTypeLabel, selected && styles.vehicleTypeLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Vehicle location</Text>
      <LocationPicker
        latitude={selectedVehicleLocation.latitude}
        longitude={selectedVehicleLocation.longitude}
        onLocationSelect={handleLocationSelect}
        label={bookingForm.vehicleLocationLabel}
        onLabelChange={(value) => handleFormChange('vehicleLocationLabel', value)}
        placeholderColor={placeholderColor}
        useCurrentLocation={handleUseCurrentLocation}
      />

      <Text style={styles.sectionTitle}>Choose service center</Text>
      {loadingCenters && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ActivityIndicator color="#FF9800" size="small" />
          <Text style={{ fontSize: 12, color: '#6B7280' }}>Finding nearby service centers…</Text>
        </View>
      )}
      {sortedServiceCenters.length > 0 ? (
        <View style={styles.centerList}>
          {sortedServiceCenters.map((center) => {
            const selected = (center.id || center._id) === bookingForm.serviceCenterId;
            return (
              <Pressable
                key={center.id || center._id}
                style={[styles.centerCard, selected && styles.centerCardActive]}
                onPress={() => handleFormChange('serviceCenterId', center.id || center._id)}
              >
                <View style={styles.centerHeader}>
                  <Text style={[styles.centerName, selected && styles.centerNameActive]}>
                    {center.name}
                  </Text>
                  {selected && <Text style={styles.selectedBadge}>✓</Text>}
                </View>
                {center.distance != null && (
                  <Text style={styles.centerDistance}>
                    {(center.distance / 1000).toFixed(1)} km away
                  </Text>
                )}
                {center.address ? (
                  <Text style={[styles.centerQueue, { marginTop: 2, color: '#6B7280' }]} numberOfLines={1}>
                    📍 {center.address}
                  </Text>
                ) : null}
                <Text style={styles.centerQueue}>
                  Queue: {center.currentQueueLength || 0} vehicles
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noDataText}>No service centers available</Text>
      )}

      {/* Technician Selection with AI Performance Badges */}
      <View style={styles.techSectionHeader}>
        <Text style={styles.sectionTitle}>Choose Technician</Text>
      </View>
      <Text style={styles.techSectionSub}>
        Model evaluates experience, ratings, and vehicle compatibility for your {bookingForm.vehicleType || 'Car'}:
      </Text>

      {loadingTechnicians ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator color="#003D82" size="small" />
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Calculating AI performance match…</Text>
        </View>
      ) : technicians.length > 0 ? (
        <View style={styles.centerList}>
          {technicians.map((tech) => {
            const techId = tech.id || tech._id;
            const selected = techId === bookingForm.technicianId;
            const ai = tech.aiPrediction || {};
            const isHigh = ai.level === 'HIGH';
            const isMedium = ai.level === 'MEDIUM';
            const isLow = ai.level === 'LOW';
            const isTop = Boolean(ai.isTopRecommendation);

            return (
              <Pressable
                key={techId}
                style={[
                  styles.centerCard,
                  selected && styles.centerCardActive,
                  isTop && styles.topTechCard
                ]}
                onPress={() => handleFormChange('technicianId', techId)}
              >
                {isTop && (
                  <View style={styles.topBadgeContainer}>
                    <Text style={styles.topBadgeText}>⭐ AI TOP RECOMMENDATION</Text>
                  </View>
                )}

                <View style={styles.centerHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={[styles.centerName, selected && styles.centerNameActive]}>
                        {tech.name}
                      </Text>

                      {/* AI Performance Badges */}
                      {isHigh && (
                        <View style={styles.aiBadgeHigh}>
                          <Text style={styles.aiBadgeHighText}>⚡ HIGH Performance</Text>
                        </View>
                      )}
                      {isMedium && (
                        <View style={styles.aiBadgeMedium}>
                          <Text style={styles.aiBadgeMediumText}>⚡ MEDIUM Match</Text>
                        </View>
                      )}
                      {isLow && (
                        <View style={styles.aiBadgeLow}>
                          <Text style={styles.aiBadgeLowText}>⚡ LOW Match</Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {tech.specialization || 'Service Technician'}
                    </Text>
                  </View>
                  {selected && <Text style={styles.selectedBadge}>✓ Selected</Text>}
                </View>

                {/* Technician Stats */}
                <View style={styles.techMetricsRow}>
                  <Text style={styles.metricItem}>
                    ⭐ {tech.averageRating ? Number(tech.averageRating).toFixed(1) : '4.5'}
                  </Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text style={styles.metricItem}>
                    🛠️ {tech.experienceYears || 0} yrs exp
                  </Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text style={styles.metricItem}>
                    📋 {tech.totalJobs || 0} jobs
                  </Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text style={styles.metricSuccess}>
                    🎯 {tech.successRate || 100}%
                  </Text>
                </View>

                {/* AI Insight Snippet */}
                <View style={[styles.aiInsightBox, isHigh ? styles.aiInsightBoxHigh : styles.aiInsightBoxNormal]}>
                  <Text style={[styles.aiInsightText, isHigh ? styles.aiInsightTextHigh : styles.aiInsightTextNormal]}>
                    {isHigh
                      ? `High efficiency predicted for ${bookingForm.vehicleType || 'Car'} • ${selectedService?.name || normalizedServiceType}`
                      : isMedium
                      ? `Reliable service match for ${bookingForm.vehicleType || 'Car'} • ${selectedService?.name || normalizedServiceType}`
                      : `Standard performance baseline for ${bookingForm.vehicleType || 'Car'}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 16 }}>
          Auto-assigned to available technician
        </Text>
      )}

      <Text style={styles.sectionTitle}>Your details</Text>
      <TextInput
        placeholder="Full name *"
        style={styles.input}
        value={bookingForm.customerName}
        onChangeText={(value) => handleFormChange('customerName', value)}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Email"
        keyboardType="email-address"
        style={styles.input}
        value={bookingForm.customerEmail}
        onChangeText={(value) => handleFormChange('customerEmail', value)}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        placeholder="Phone"
        keyboardType="phone-pad"
        style={styles.input}
        value={bookingForm.customerPhone}
        onChangeText={(value) => handleFormChange('customerPhone', value)}
        placeholderTextColor={placeholderColor}
      />

      <Text style={styles.sectionTitle}>Preferred slot</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.pickerButton, styles.rowInput]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.pickerButtonText}>📅 {formatDateForDisplay(bookingForm.preferredDate)}</Text>
        </Pressable>
        <Pressable
          style={[styles.pickerButton, styles.rowInput]}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.pickerButtonText}>🕐 {formatTimeForDisplay(bookingForm.preferredTime)}</Text>
        </Pressable>
      </View>

      {showDatePicker && (
        <View style={styles.pickerSurface}>
          <DateTimePicker
            value={bookingForm.preferredDate ? new Date(bookingForm.preferredDate) : tempDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={new Date()}
            themeVariant="dark"
            textColor="#FFFFFF"
            accentColor="#FFA500"
          />
        </View>
      )}

      {showTimePicker && (
        <View style={styles.pickerSurface}>
          <DateTimePicker
            value={bookingForm.preferredTime ? (() => {
              const [hours, minutes] = bookingForm.preferredTime.split(':');
              const date = new Date();
              date.setHours(parseInt(hours, 10), parseInt(minutes || 0, 10));
              return date;
            })() : tempTime}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            is24Hour={true}
            themeVariant="dark"
            textColor="#FFFFFF"
            accentColor="#FFA500"
          />
        </View>
      )}

      {bookingError ? <Text style={styles.error}>{bookingError}</Text> : null}
      {bookingResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>✅ You are booked!</Text>
          <Pressable
            style={styles.copyButton}
            onPress={async () => {
              await Clipboard.setStringAsync(bookingResult.confirmationCode);
              Alert.alert('📋 Copied!', `${bookingResult.confirmationCode} copied to clipboard.`);
            }}
          >
            <Text style={styles.resultCode}>{bookingResult.confirmationCode}</Text>
            <Text style={styles.copyHint}>📋 Tap to copy</Text>
          </Pressable>
          <Text style={styles.resultText}>
            Queue #{bookingResult.queueNumber} · Status {bookingResult.queueStatus}
          </Text>
          <Pressable
            style={styles.viewAppointmentsButton}
            onPress={() => navigation.navigate('Appointments')}
          >
            <Text style={styles.viewAppointmentsButtonText}>View My Appointments</Text>
          </Pressable>
        </View>
      ) : null}

      {!bookingResult && (
        <Pressable style={styles.primaryButton} onPress={handleBook} disabled={submitting}>
          <Text style={styles.primaryButtonLabel}>{submitting ? 'Submitting…' : 'Submit request'}</Text>
        </Pressable>
      )}

      <Text style={styles.meta}>API: {API_BASE_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
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
    fontWeight: '600',
    marginTop: 8
  },
  serviceChips: {
    marginVertical: 6
  },
  serviceChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  serviceChipActive: {
    backgroundColor: '#003D82',
    borderColor: '#003D82'
  },
  serviceChipLabel: {
    color: '#6B7280'
  },
  serviceChipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  serviceInfo: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#B3D9F2'
  },
  serviceName: {
    color: '#FF5722',
    fontWeight: '600',
    fontSize: 16
  },
  serviceDescription: {
    color: '#6B7280'
  },
  serviceMeta: {
    color: '#9CA3AF',
    fontSize: 14
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6
  },
  vehicleTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 4
  },
  vehicleTypeChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#003D82'
  },
  vehicleTypeIcon: {
    fontSize: 15
  },
  vehicleTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563'
  },
  vehicleTypeLabelActive: {
    color: '#003D82',
    fontWeight: '700'
  },
  techSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  aiHeaderTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  aiHeaderTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7'
  },
  techSectionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6
  },
  topTechCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF5'
  },
  topBadgeContainer: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  topBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  aiBadgeHigh: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  aiBadgeHighText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700'
  },
  aiBadgeMedium: {
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE047'
  },
  aiBadgeMediumText: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '700'
  },
  aiBadgeLow: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  aiBadgeLowText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600'
  },
  techMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  metricItem: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500'
  },
  metricDot: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  metricSuccess: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700'
  },
  aiInsightBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3
  },
  aiInsightBoxHigh: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#16A34A'
  },
  aiInsightBoxNormal: {
    backgroundColor: '#F8FAFC',
    borderLeftColor: '#94A3B8'
  },
  aiInsightText: {
    fontSize: 11,
    fontWeight: '500'
  },
  aiInsightTextHigh: {
    color: '#166534'
  },
  aiInsightTextNormal: {
    color: '#475569'
  },
  centerList: {
    gap: 12,
    marginVertical: 6
  },
  centerCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB'
  },
  centerCardActive: {
    borderColor: '#FF5722',
    backgroundColor: '#FFF5F0'
  },
  centerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  centerName: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600'
  },
  centerNameActive: {
    color: '#FF5722'
  },
  selectedBadge: {
    color: '#FF5722',
    fontSize: 18,
    fontWeight: '700'
  },
  centerDistance: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4
  },
  centerQueue: {
    color: '#9CA3AF',
    fontSize: 14
  },
  noDataText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16
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
  notes: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  rowInput: {
    flex: 1
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
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed'
  },
  copyHint: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '500'
  },
  resultText: {
    color: '#1F2937',
    marginBottom: 12
  },
  viewAppointmentsButton: {
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8
  },
  viewAppointmentsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  meta: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8
  },
  pickerButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#003D82',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pickerButtonText: {
    color: '#003D82',
    fontSize: 16,
    fontWeight: '600'
  },
  pickerSurface: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    marginTop: 4
  }
});
