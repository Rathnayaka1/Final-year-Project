import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions
} from 'react-native';

let MapView, Marker;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('react-native-maps not available');
  }
}

const OPENSTREETMAP_SEARCH_API = 'https://nominatim.openstreetmap.org/search';

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  label,
  onLabelChange,
  placeholderColor,
  useCurrentLocation
}) {
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, isSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const debounceTimer = useRef(null);
  const mapRef = useRef(null);

  const handleMapPress = (e) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    onLocationSelect(lat, lng);
  };

  const searchAddress = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        isSearching(true);
        const response = await fetch(`${OPENSTREETMAP_SEARCH_API}?q=${encodeURIComponent(query)}&limit=5&format=json`, {
          headers: {
            'User-Agent': 'ServiceCenterMobileApp/1.0',
            'Accept': 'application/json'
          }
        });
        const results = await response.json();
        setSearchResults(results || []);
      } catch (err) {
        console.warn('Search failed:', err);
        setSearchResults([]);
      } finally {
        isSearching(false);
      }
    }, 500);
  };

  const handleSelectResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    onLocationSelect(lat, lng);
    onLabelChange(name);
    setAddressSearch('');
    setSearchResults([]);
  };

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const result = await useCurrentLocation?.();
      if (result && result.accuracy) {
        setAccuracy(result.accuracy.toFixed(1));
      }
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Live Location Card - Primary Feature */}
      <View style={styles.liveLocationCard}>
        <View style={styles.liveLocationHeader}>
          <Text style={styles.liveLocationTitle}>📍 Your Vehicle Location</Text>
          <Text style={styles.liveLocationCoords}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        </View>

        {/* Interactive Map */}
        {MapView ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={{
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={{ latitude, longitude }}
                title="Vehicle Location"
                description={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                pinColor="#FF9800"
              />
            </MapView>
            <Text style={styles.mapHint}>Tap on the map to pick a location</Text>
          </View>
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackText}>🗺️ Map is not available on this platform</Text>
          </View>
        )}

        <Pressable
          style={[styles.gpsButton, gpsLoading && styles.gpsButtonLoading]}
          onPress={handleUseCurrentLocation}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <>
              <ActivityIndicator color="#FFFFFF" size={20} style={styles.gpsSpinner} />
              <Text style={styles.gpsButtonText}>Getting your location...</Text>
            </>
          ) : (
            <>
              <Text style={styles.gpsButtonIcon}>🎯</Text>
              <Text style={styles.gpsButtonText}>Use My Current Location</Text>
            </>
          )}
        </Pressable>

        {accuracy && (
          <Text style={styles.accuracyText}>Accuracy: ±{accuracy} meters</Text>
        )}

        <Text style={styles.liveLocationHint}>Tap the button or tap on the map to set location</Text>
      </View>

      {/* Address Search - Alternative Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Search by address</Text>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Enter street address..."
            style={styles.searchInput}
            value={addressSearch}
            onChangeText={(text) => {
              setAddressSearch(text);
              searchAddress(text);
            }}
            placeholderTextColor="#9CA3AF"
          />
          {searching && <ActivityIndicator style={styles.searchSpinner} color="#003D82" />}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            {searchResults.map((result, idx) => (
              <Pressable
                key={idx}
                style={styles.resultItem}
                onPress={() => handleSelectResult(result)}
              >
                <Text style={styles.resultName}>{result.display_name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Location Label */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Location label</Text>
        <TextInput
          placeholder="e.g., Home, Office, Parking Lot #3 (optional)"
          style={styles.labelInput}
          value={label}
          onChangeText={onLabelChange}
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginVertical: 8
  },
  liveLocationCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFA500',
    gap: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  liveLocationHeader: {
    gap: 6
  },
  liveLocationTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700'
  },
  liveLocationCoords: {
    color: '#EA580C',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  gpsButton: {
    backgroundColor: '#FF9800',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  gpsButtonLoading: {
    backgroundColor: '#FB923C',
    opacity: 0.8
  },
  gpsButtonIcon: {
    fontSize: 24
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  gpsSpinner: {
    marginRight: -5
  },
  accuracyText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center'
  },
  liveLocationHint: {
    color: '#92400E',
    fontSize: 12,
    textAlign: 'center'
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    color: '#1F2937',
    paddingVertical: 12,
    fontSize: 14
  },
  searchSpinner: {
    marginLeft: 8
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  resultName: {
    color: '#1F2937',
    fontSize: 13
  },
  labelInput: {
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    fontSize: 13
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  map: {
    width: '100%',
    height: 200
  },
  mapHint: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#F9FAFB'
  },
  mapFallback: {
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapFallbackText: {
    color: '#9CA3AF',
    fontSize: 13
  }
});
