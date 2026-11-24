import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
} from 'react-native';
import {
  Text,
  Button,
  RadioButton,
  Divider,
  List,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/auth';
import i18n from '../../src/i18n/index';

const LANGUAGE_STORAGE_KEY = 'preferred_language';

type SupportedLanguage = 'en' | 'hi' | 'te';

interface LanguageOption {
  code: SupportedLanguage;
  labelKey: 'settings.english' | 'settings.hindi' | 'settings.telugu';
  nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', labelKey: 'settings.english', nativeLabel: 'English' },
  { code: 'hi', labelKey: 'settings.hindi', nativeLabel: 'हिंदी' },
  { code: 'te', labelKey: 'settings.telugu', nativeLabel: 'తెలుగు' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearAuth } = useAuthStore();

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Load saved language preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && ['en', 'hi', 'te'].includes(saved)) {
          const lang = saved as SupportedLanguage;
          setSelectedLanguage(lang);
          await i18n.changeLanguage(lang);
        }
      } catch (err) {
        console.warn('[Settings] Failed to load language preference:', err);
      }
    })();
  }, []);

  async function handleLanguageChange(lang: SupportedLanguage) {
    try {
      setSelectedLanguage(lang);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (err) {
      console.warn('[Settings] Failed to save language preference:', err);
      setSnackbarMessage(t('common.error'));
      setSnackbarVisible(true);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch (err) {
      // Even if the API call fails, we still clear local auth
      console.warn('[Settings] Logout API call failed:', err);
    } finally {
      clearAuth();
      setIsLoggingOut(false);
      router.replace('/(auth)/login');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            {t('settings.title')}
          </Text>
        </View>

        <Divider />

        {/* Language Section */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>
            {t('settings.language')}
          </List.Subheader>

          <View style={styles.radioGroup}>
            {LANGUAGES.map((lang) => (
              <View key={lang.code} style={styles.radioRow}>
                <RadioButton.Android
                  value={lang.code}
                  status={selectedLanguage === lang.code ? 'checked' : 'unchecked'}
                  onPress={() => handleLanguageChange(lang.code)}
                  color="#1565C0"
                />
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.radioLabel,
                    selectedLanguage === lang.code && styles.radioLabelSelected,
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  {lang.nativeLabel}
                </Text>
              </View>
            ))}
          </View>
        </List.Section>

        <Divider />

        {/* Sign Out Section */}
        <View style={styles.logoutSection}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            textColor="#d32f2f"
            icon="logout"
          >
            {isLoggingOut ? (
              <ActivityIndicator animating size="small" />
            ) : (
              t('settings.logout')
            )}
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1565C0',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    backgroundColor: '#f5f5f5',
  },
  radioGroup: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  radioLabel: {
    marginLeft: 4,
    color: '#424242',
  },
  radioLabelSelected: {
    color: '#1565C0',
    fontWeight: '600',
  },
  logoutSection: {
    padding: 24,
  },
  logoutButton: {
    borderColor: '#d32f2f',
    borderRadius: 8,
  },
  logoutButtonContent: {
    paddingVertical: 6,
  },
});
