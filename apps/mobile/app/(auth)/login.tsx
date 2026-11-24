import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Snackbar,
  ActivityIndicator,
  Surface,
  Chip,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/auth';
import { ApiError } from '../../src/types';
import { AxiosError } from 'axios';

interface QuickPersona {
  label: string;
  role: string;
  username: string;
  pass: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const QUICK_PERSONAS: QuickPersona[] = [
  {
    label: 'Resident (Suresh)',
    role: 'Flat A-102',
    username: 'suresh.kumar',
    pass: 'Demo@1234',
    icon: 'home-account',
    color: '#1565C0',
  },
  {
    label: 'President (Ramesh)',
    role: 'Flat A-101 (Admin)',
    username: 'ramesh.naidu',
    pass: 'Demo@1234',
    icon: 'crown',
    color: '#6A1B9A',
  },
  {
    label: 'Security Guard',
    role: 'Gate 1 (Ramu)',
    username: 'guard.gate1',
    pass: 'Guard@1234',
    icon: 'shield-account',
    color: '#0D47A1',
  },
  {
    label: 'Maid (Sunita)',
    role: 'Permanent Domestic Help',
    username: 'sunita_maid',
    pass: 'Provider#123',
    icon: 'broom',
    color: '#E65100',
  },
  {
    label: 'Tutor (Priya)',
    role: 'Internal Resident Tutor',
    username: 'priya_a202',
    pass: 'Provider#123',
    icon: 'school',
    color: '#2E7D32',
  },
  {
    label: 'Delivery Agent',
    role: 'Delivery Partner',
    username: 'delivery.1',
    pass: 'Delivery@1',
    icon: 'truck-delivery',
    color: '#374151',
  },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [username, setUsername] = useState('suresh.kumar');
  const [password, setPassword] = useState('Demo@1234');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authService.login(username, password),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);

      if (data.user.mustChangePassword) {
        router.replace('/(auth)/change-password');
      } else {
        const role = data.user.role;
        const routeSegment = getRoleRouteSegment(role);
        router.replace(`/(app)/home/${routeSegment}` as any);
      }
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.message ??
        t('login.error.invalidCredentials');
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    },
  });

  function getRoleRouteSegment(role: string): string {
    switch (role) {
      case 'resident': return 'resident';
      case 'president': return 'president';
      case 'guard': return 'guard';
      case 'supplier': return 'supplier';
      case 'provider_internal':
      case 'provider_external': return 'provider';
      case 'delivery_partner': return 'delivery';
      default: return 'resident';
    }
  }

  function validate(): boolean {
    let valid = true;
    if (!username.trim()) {
      setUsernameError(t('login.error.required'));
      valid = false;
    } else {
      setUsernameError('');
    }
    if (!password.trim()) {
      setPasswordError(t('login.error.required'));
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  }

  function handleLogin() {
    if (!validate()) return;
    loginMutation.mutate();
  }

  function selectPersona(p: QuickPersona) {
    setUsername(p.username);
    setPassword(p.pass);
    setUsernameError('');
    setPasswordError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="office-building" size={40} color="#FFFFFF" />
          </View>
          <Text variant="headlineMedium" style={styles.brandTitle}>
            OneSociety
          </Text>
          <Text variant="bodyMedium" style={styles.brandSubtitle}>
            Green Valley Apartments • Smart Living System
          </Text>
        </View>

        {}
        <Surface style={styles.personaSurface} elevation={1}>
          <Text style={styles.personaHeader}>
            <MaterialCommunityIcons name="account-switch" size={16} color="#475569" /> QUICK PERSONA SELECTOR
          </Text>
          <Text style={styles.personaSub}>Tap any role to auto-fill credentials for testing:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personaRow}
          >
            {QUICK_PERSONAS.map((p) => {
              const isSelected = username === p.username;
              return (
                <TouchableOpacity
                  key={p.username}
                  onPress={() => selectPersona(p)}
                  style={[
                    styles.personaChip,
                    isSelected && { borderColor: p.color, backgroundColor: `${p.color}15` },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name={p.icon} size={18} color={p.color} />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={[styles.personaChipTitle, isSelected && { color: p.color, fontWeight: '700' }]}>
                      {p.label}
                    </Text>
                    <Text style={styles.personaChipRole}>{p.role}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Surface>

        {}
        <Surface style={styles.card} elevation={2}>
          <Text variant="titleLarge" style={styles.cardHeader}>
            Sign In
          </Text>

          <TextInput
            label={t('login.username')}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (usernameError) setUsernameError('');
            }}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            error={!!usernameError}
            testID="username-input"
          />
          {!!usernameError && (
            <HelperText type="error" visible={!!usernameError}>
              {usernameError}
            </HelperText>
          )}

          <TextInput
            label={t('login.password')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError('');
            }}
            mode="outlined"
            secureTextEntry={!passwordVisible}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={passwordVisible ? 'eye-off' : 'eye'}
                onPress={() => setPasswordVisible(!passwordVisible)}
              />
            }
            style={styles.input}
            error={!!passwordError}
            testID="password-input"
          />
          {!!passwordError && (
            <HelperText type="error" visible={!!passwordError}>
              {passwordError}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor="#1565C0"
            icon="login"
            testID="login-button"
          >
            {loginMutation.isPending ? (
              <ActivityIndicator animating color="white" size="small" />
            ) : (
              t('login.button')
            )}
          </Button>
        </Surface>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{ label: t('common.cancel'), onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#64748B',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  personaSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  personaHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  personaSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  personaRow: {
    gap: 8,
    paddingVertical: 2,
  },
  personaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  personaChipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  personaChipRole: {
    fontSize: 10,
    color: '#64748B',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  input: {
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 14,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
