import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Snackbar,
  Banner,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authService } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/auth';
import { ApiError } from '../../src/types';
import { AxiosError } from 'axios';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const mustChange = user?.mustChangePassword ?? false;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [currentError, setCurrentError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
      const role = user?.role ?? 'resident';
      const routeSegment = getRoleRouteSegment(role);
      router.replace(`/(app)/home/${routeSegment}` as any);
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.message ?? t('common.error');
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

    if (!currentPassword.trim()) {
      setCurrentError(t('login.error.required'));
      valid = false;
    } else {
      setCurrentError('');
    }

    if (!newPassword.trim()) {
      setNewError(t('login.error.required'));
      valid = false;
    } else {
      setNewError('');
    }

    if (!confirmPassword.trim()) {
      setConfirmError(t('login.error.required'));
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError(t('changePassword.mismatch'));
      valid = false;
    } else {
      setConfirmError('');
    }

    return valid;
  }

  function handleChangePassword() {
    if (!validate()) return;
    changePasswordMutation.mutate();
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
        {mustChange && (
          <Banner
            visible={mustChange}
            icon="information"
            style={styles.banner}
          >
            {t('changePassword.firstLogin')}
          </Banner>
        )}

        <Surface style={styles.card} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('changePassword.title')}
          </Text>

          <TextInput
            label={t('changePassword.current')}
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (currentError) setCurrentError('');
            }}
            mode="outlined"
            secureTextEntry={!currentPasswordVisible}
            right={
              <TextInput.Icon
                icon={currentPasswordVisible ? 'eye-off' : 'eye'}
                onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}
              />
            }
            style={styles.input}
            error={!!currentError}
          />
          {!!currentError && (
            <HelperText type="error" visible={!!currentError}>
              {currentError}
            </HelperText>
          )}

          <TextInput
            label={t('changePassword.new')}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (newError) setNewError('');
            }}
            mode="outlined"
            secureTextEntry={!newPasswordVisible}
            right={
              <TextInput.Icon
                icon={newPasswordVisible ? 'eye-off' : 'eye'}
                onPress={() => setNewPasswordVisible(!newPasswordVisible)}
              />
            }
            style={styles.input}
            error={!!newError}
          />
          {!!newError && (
            <HelperText type="error" visible={!!newError}>
              {newError}
            </HelperText>
          )}

          <TextInput
            label={t('changePassword.confirm')}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmError) setConfirmError('');
            }}
            mode="outlined"
            secureTextEntry={!confirmPasswordVisible}
            right={
              <TextInput.Icon
                icon={confirmPasswordVisible ? 'eye-off' : 'eye'}
                onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              />
            }
            style={styles.input}
            error={!!confirmError}
          />
          {!!confirmError && (
            <HelperText type="error" visible={!!confirmError}>
              {confirmError}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleChangePassword}
            disabled={changePasswordMutation.isPending}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator animating color="white" size="small" />
            ) : (
              t('changePassword.button')
            )}
          </Button>
        </Surface>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{
          label: t('common.cancel'),
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  banner: {
    marginBottom: 16,
    borderRadius: 8,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
