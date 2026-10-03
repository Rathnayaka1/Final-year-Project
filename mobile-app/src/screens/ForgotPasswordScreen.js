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
import { requestPasswordReset, verifyResetOTP, resetPassword } from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: phone, 2: OTP, 3: new password
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const placeholderColor = '#9CA3AF';

  async function handleRequestOTP() {
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await requestPasswordReset(phone.trim());
      setSuccessMessage('OTP sent to your phone');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) {
      setError('OTP is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await verifyResetOTP(phone.trim(), otp.trim());
      setResetToken(response.resetToken);
      setSuccessMessage('OTP verified successfully');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await resetPassword(resetToken, newPassword);
      setSuccessMessage('Password reset successfully!');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reset password');
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
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Enter your phone number to receive OTP'}
            {step === 2 && 'Enter the OTP sent to your phone'}
            {step === 3 && 'Create a new password'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Step 1: Phone Number */}
          {step === 1 && (
            <>
              <TextInput
                placeholder="Phone Number"
                keyboardType="phone-pad"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                editable={!loading}
              />

              <Pressable style={styles.button} onPress={handleRequestOTP} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </Pressable>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <>
              <Text style={styles.phoneDisplay}>Phone: {phone}</Text>
              
              <TextInput
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholderTextColor={placeholderColor}
                maxLength={6}
                editable={!loading}
              />

              <Pressable style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </Pressable>

              <Pressable 
                style={styles.resendLink} 
                onPress={handleRequestOTP}
                disabled={loading}
              >
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <TextInput
                placeholder="New Password"
                secureTextEntry
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor={placeholderColor}
                editable={!loading}
              />

              <TextInput
                placeholder="Confirm Password"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor={placeholderColor}
                editable={!loading}
              />

              <Pressable style={styles.button} onPress={handleResetPassword} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </Pressable>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.backLink}>
            <Text style={styles.backLinkText}>
              Back to <Text style={styles.backLinkBold}>Login</Text>
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
  phoneDisplay: {
    fontSize: 14,
    color: '#003D82',
    fontWeight: '600',
    marginBottom: 8
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
  success: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600'
  },
  button: {
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  resendLink: {
    alignItems: 'center',
    marginTop: 8
  },
  resendText: {
    color: '#0051B3',
    fontSize: 14,
    fontWeight: '600'
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16
  },
  backLinkText: {
    color: '#6B7280',
    fontSize: 14
  },
  backLinkBold: {
    color: '#FF5722',
    fontWeight: '600'
  }
});
