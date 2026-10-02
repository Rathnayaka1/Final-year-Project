import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  TextInput,
  View,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { bookService, getServices, getNearbyServiceCenters, API_BASE_URL } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const defaultVehicleLocation = {
  latitude: 6.9271,
  longitude: 79.8612
};

const initialBooking = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  serviceId: '',
  serviceCenterId: '',
  preferredDate: '',
  preferredTime: '',
  vehicleLocationLabel: '',
  vehicleLocationLatitude: '',
  vehicleLocationLongitude: '',
  notes: ''
};

export default function BookScreen({ navigation }) {
  const { token, user } = useAuth();
  const [services, setServices] = useState([]);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [bookingForm, setBookingForm] = useState(initialBooking);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const placeholderColor = '#9CA3AF';

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesList, centers] = await Promise.all([
          getServices(),
          getNearbyServiceCenters(6.9271, 79.8612, 50000).catch(() => [])
        ]);
        
        setServices(servicesList);
        setServiceCenters(centers);
        
        setBookingForm((prev) => ({ 
          ...prev, 
          customerName: prev.customerName || user?.name || '',
          customerEmail: prev.customerEmail || user?.email || '',
          customerPhone: prev.customerPhone || user?.phone || '',
          serviceId: prev.serviceId || servicesList[0]?.id,
          serviceCenterId: prev.serviceCenterId || centers[0]?.id || centers[0]?._id,
          vehicleLocationLatitude: prev.vehicleLocationLatitude || defaultVehicleLocation.latitude.toString(),
          vehicleLocationLongitude: prev.vehicleLocationLongitude || defaultVehicleLocation.longitude.toString()
        }));
      } catch (err) {
        setBookingError('Unable to load services right now.');
      } finally {
        setLoadingServices(false);
      }
    }

    loadData();
  }, [user]);

  const selectedService = useMemo(
    () => services.find((svc) => svc.id === bookingForm.serviceId),
    [services, bookingForm.serviceId]
  );

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
          setBookingError('Location service is not available on this device.');
          return null;
        }
      }

      if (!Location) {
        setBookingError('Location service is not available on this platform.');
        return null;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setBookingError('Location permission is required. Please enable it in settings.');
        return null;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      handleLocationSelect(
        currentPosition.coords.latitude,
        currentPosition.coords.longitude
      );
      
      return {
        accuracy: currentPosition.coords.accuracy || 0,
        altitude: currentPosition.coords.altitude
      };
    } catch (err) {
      console.error('Location error:', err);
      setBookingError('Unable to get your location. Please try again or enter coordinates manually.');
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
      setBookingError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Choose a service</Text>
      {loadingServices ? (
        <ActivityIndicator color="#003D82" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceChips}>
          {services.map((service) => {
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

      <Text style={styles.sectionTitle}>Choose service center</Text>
      {serviceCenters.length > 0 ? (
        <View style={styles.centerList}>
          {serviceCenters.map((center) => {
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
                {center.distance && (
                  <Text style={styles.centerDistance}>
                    {(center.distance / 1000).toFixed(1)} km away
                  </Text>
                )}
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
      <TextInput
        placeholder="Notes for technician"
        style={[styles.input, styles.notes]}
        multiline
        value={bookingForm.notes}
        onChangeText={(value) => handleFormChange('notes', value)}
        placeholderTextColor={placeholderColor}
      />

      {bookingError ? <Text style={styles.error}>{bookingError}</Text> : null}
      {bookingResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>✅ You are booked!</Text>
          <Text style={styles.resultCode}>{bookingResult.confirmationCode}</Text>
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

      <Pressable style={styles.primaryButton} onPress={handleBook} disabled={submitting || !!bookingResult}>
        <Text style={styles.primaryButtonLabel}>{submitting ? 'Submitting…' : 'Submit request'}</Text>
      </Pressable>

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
