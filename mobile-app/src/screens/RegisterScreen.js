import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const placeholderColor = '#9CA3AF';

  async function handleRegister() {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register({ 
        name: name.trim(), 
        phone: phone.trim(), 
        username: username.trim() || undefined,
        email: email.trim() || undefined, 
        password 
      });
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
        setError('Cannot connect to server. Check backend is running and phone/PC are on same network.');
      } else {
        setError(err.response?.data?.error || err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register to book service appointments</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="Full Name *"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={placeholderColor}
          />

          <TextInput
            placeholder="Username (optional)"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Phone Number *"
            keyboardType="phone-pad"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Email (optional)"
            keyboardType="email-address"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password *"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={placeholderColor}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center'
  },
  header: {
    marginBottom: 32
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280'
  },
  form: {
    gap: 16
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    fontSize: 16
  },
  error: {
    color: '#EF4444',
    fontSize: 14
  },
  registerButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 14
  },
  loginLinkBold: {
    color: '#0051B3',
    fontWeight: '600'
  }
});
