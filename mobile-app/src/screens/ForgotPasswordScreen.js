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
import { requestPasswordReset, verifyResetAccount, resetPassword } from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: phone, 2: username, 3: new password, 4: success
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const placeholderColor = '#9CA3AF';

  async function handleCheckPhone() {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await requestPasswordReset(trimmedPhone);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to find account');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAccount() {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Username is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await verifyResetAccount(phone.trim(), trimmedUsername);
      setResetToken(response.resetToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed');
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
    if (!confirmPassword.trim()) {
      setError('Please confirm your new password');
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
      setStep(4);
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
          <Text style={styles.title}>
            {step === 4 ? 'Password Reset Successful' : 'Forgot Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Enter your registered phone number to find your account.'}
            {step === 2 && 'Enter the username associated with this account to verify your identity.'}
            {step === 3 && 'Create a new password for your account.'}
            {step === 4 && 'Your password has been updated. You can now login using your new password.'}
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
                onChangeText={(val) => { setPhone(val); setError(''); }}
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                editable={!loading}
              />

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCheckPhone}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </Pressable>
            </>
          )}

          {/* Step 2: Username Verification */}
          {step === 2 && (
            <>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeLabel}>Phone Number</Text>
                <Text style={styles.infoBadgeValue}>{phone.trim()}</Text>
              </View>

              <TextInput
                placeholder="Username"
                style={styles.input}
                value={username}
                onChangeText={(val) => { setUsername(val); setError(''); }}
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                editable={!loading}
              />

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify Account</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.secondaryLink}
                onPress={() => { setStep(1); setError(''); setUsername(''); }}
              >
                <Text style={styles.secondaryLinkText}>Use a different phone number</Text>
              </Pressable>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="New Password"
                  secureTextEntry={!showNewPassword}
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={(val) => { setNewPassword(val); setError(''); }}
                  placeholderTextColor={placeholderColor}
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Text style={styles.eyeText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Confirm Password"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={(val) => { setConfirmPassword(val); setError(''); }}
                  placeholderTextColor={placeholderColor}
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </Pressable>
            </>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Pressable
                style={styles.button}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>Back to Login</Text>
              </Pressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step !== 4 && (
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.backLink}>
              <Text style={styles.backLinkText}>
                Back to <Text style={styles.backLinkBold}>Login</Text>
              </Text>
            </Pressable>
          )}
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
    color: '#6B7280',
    lineHeight: 22
  },
  form: {
    gap: 16
  },
  infoBadge: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  infoBadgeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2
  },
  infoBadgeValue: {
    fontSize: 15,
    color: '#003D82',
    fontWeight: '600'
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  passwordInput: {
    flex: 1,
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 16
  },
  eyeText: {
    color: '#0051B3',
    fontSize: 13,
    fontWeight: '600'
  },
  error: {
    color: '#EF4444',
    fontSize: 14
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
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryLink: {
    alignItems: 'center',
    marginTop: 4
  },
  secondaryLinkText: {
    color: '#0051B3',
    fontSize: 14,
    fontWeight: '600'
  },
  successContainer: {
    alignItems: 'center',
    gap: 24
  },
  successIcon: {
    fontSize: 64,
    color: '#10B981',
    fontWeight: '700'
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
