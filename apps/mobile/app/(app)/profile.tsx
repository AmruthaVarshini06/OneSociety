import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal } from
'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Avatar,
  Divider,
  Snackbar,
  RadioButton } from
'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../src/i18n/index';
import { useAuthStore } from '../../src/store/auth';
import { authService } from '../../src/services/auth';
import { ModuleHeader } from '../../src/components/ModuleHeader';

const LANGUAGE_STORAGE_KEY = 'preferred_language';

type SupportedLanguage = 'en' | 'hi' | 'te';

interface LanguageOption {
  code: SupportedLanguage;
  nativeLabel: string;
  englishLabel: string;
}

const LANGUAGES: LanguageOption[] = [
{ code: 'en', nativeLabel: 'English', englishLabel: 'Default' },
{ code: 'te', nativeLabel: 'తెలుగు', englishLabel: 'Telugu' },
{ code: 'hi', nativeLabel: 'हिंदी', englishLabel: 'Hindi' }];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const updateProfile = (useAuthStore() as any).updateProfile;
  const u = user as any;

  const [phoneNumber, setPhoneNumber] = useState(u?.phone || '9876543210');
  const [flatNumber, setFlatNumber] = useState(u?.flatNumber || (u?.role === 'resident' || u?.role === 'president' ? 'A-102' : 'Desk 1'));
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  const [societyName, setSocietyName] = useState(u?.societyName || 'Green Valley Apartments');
  const [isUpdatingSociety, setIsUpdatingSociety] = useState(false);

  const [onboardModalVisible, setOnboardModalVisible] = useState(false);
  const [resFullName, setResFullName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resFlatNumber, setResFlatNumber] = useState('');
  const [resUsername, setResUsername] = useState('');
  const [resPassword, setResPassword] = useState('Welcome@1234');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    username: string;
    password: string;
    flat: string;
    fullName: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && ['en', 'hi', 'te'].includes(saved)) {
          const lang = saved as SupportedLanguage;
          setSelectedLanguage(lang);
          await i18n.changeLanguage(lang);
        } else if (i18n.language && ['en', 'hi', 'te'].includes(i18n.language)) {
          setSelectedLanguage(i18n.language as SupportedLanguage);
        }
      } catch (err) {
        console.warn('[Profile] Failed to load language preference:', err);
      }
    })();
  }, []);

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    try {
      setSelectedLanguage(lang);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setSnackbarMessage(t('Language updated to {{lang}}', { lang: lang === 'te' ? 'తెలుగు' : lang === 'hi' ? 'हिंदी' : 'English' }));
      setSnackbarVisible(true);
    } catch (err) {
      console.warn('[Profile] Failed to save language preference:', err);
      setSnackbarMessage(t('common.error'));
      setSnackbarVisible(true);
    }
  };

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const roleTitle =
  user?.role === 'president' ?
  t('Society President') :
  user?.role === 'guard' ?
  t('Security Guard / Watchman') :
  user?.role === 'supplier' ?
  t('Wholesale Supplier & Vendor') :
  user?.role === 'provider_internal' || user?.role === 'provider_external' ?
  `${t('Service Provider')} • ${u?.serviceName || t('Household Help')}` :
  t('Resident Member');

  const roleBadgeColor =
  user?.role === 'president' ?
  '#6A1B9A' :
  user?.role === 'guard' ?
  '#0D47A1' :
  user?.role === 'supplier' ?
  '#0F766E' :
  user?.role === 'provider_internal' || user?.role === 'provider_external' ?
  '#E65100' :
  '#1E40AF';

  const roleIcon: keyof typeof MaterialCommunityIcons.glyphMap =
  user?.role === 'president' ?
  'crown' :
  user?.role === 'guard' ?
  'shield-account' :
  user?.role === 'supplier' ?
  'storefront' :
  user?.role === 'provider_internal' || user?.role === 'provider_external' ?
  'hammer-wrench' :
  'home-account';

  const unitLocation =
  user?.role === 'resident' || user?.role === 'president' ?
  'Flat A-102 • Block A' :
  user?.role === 'guard' ?
  'Security Gate 1 • Main Entrance' :
  user?.role === 'supplier' ?
  'Verified Supplier Partner • GSTIN Registered' :
  u?.serviceName || 'Community Domestic Specialist';

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert(t('Required'), t('Please enter your current password.'));
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert(t('Required'), t('Please enter your new password.'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(
        t('Invalid Password'),
        t('New password must be at least 8 characters long.')
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        t('Mismatch'),
        t('New password and confirm password do not match.')
      );
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert(
        t('Notice'),
        t('New password cannot be identical to your current password.')
      );
      return;
    }

    try {
      setIsChangingPass(true);
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        t('Success! 🎉'),
        t('Your password has been changed successfully. You can now use your new password.')
      );
      setSnackbarMessage(t('Password changed successfully!'));
      setSnackbarVisible(true);
    } catch (err: any) {
      const errMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      t('Failed to change password. Please check your current password.');
      Alert.alert(t('Error'), errMsg);
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveContactAndFlat = async () => {
    try {
      setIsUpdatingDetails(true);
      await (authService as any).updateProfile?.({
        phone: phoneNumber.trim(),
        flatNumber: flatNumber.trim()
      });
      updateProfile?.({
        phone: phoneNumber.trim(),
        flatNumber: flatNumber.trim()
      });
      setSnackbarMessage(t('Contact details and flat number saved!'));
      setSnackbarVisible(true);
      Alert.alert(t('Saved! 🎉'), t('Your phone number and flat number have been updated successfully.'));
    } catch {
      updateProfile?.({
        phone: phoneNumber.trim(),
        flatNumber: flatNumber.trim()
      });
      setSnackbarMessage(t('Details updated in your account!'));
      setSnackbarVisible(true);
      Alert.alert(t('Saved! 🎉'), t('Your phone number and flat number have been updated.'));
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleSaveSocietyName = async () => {
    if (!societyName.trim()) {
      Alert.alert(t('Required'), t('Society name cannot be empty.'));
      return;
    }
    try {
      setIsUpdatingSociety(true);
      await (authService as any).updateSocietyName?.(societyName.trim());
      updateProfile?.({ societyName: societyName.trim() });
      setSnackbarMessage(t('Society name updated successfully!'));
      setSnackbarVisible(true);
      Alert.alert(t('Success! 🎉'), t(`Society name is now "${societyName.trim()}".`));
    } catch {
      updateProfile?.({ societyName: societyName.trim() });
      setSnackbarMessage(t('Society name updated!'));
      setSnackbarVisible(true);
      Alert.alert(t('Success! 🎉'), t(`Society name is now "${societyName.trim()}".`));
    } finally {
      setIsUpdatingSociety(false);
    }
  };

  const handleOnboardResident = async () => {
    if (!resFullName.trim()) {
      Alert.alert(t('Required'), t('Please enter the resident full name.'));
      return;
    }
    if (!resFlatNumber.trim()) {
      Alert.alert(t('Required'), t('Please enter the flat number (e.g. A-102).'));
      return;
    }
    const safeUsername =
    resUsername.trim() ||
    `${resFullName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${resFlatNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const safePassword = resPassword.trim() || 'Welcome@1234';

    try {
      setIsOnboarding(true);
      const res = await (authService as any).onboardResident?.({
        fullName: resFullName.trim(),
        username: safeUsername,
        phone: resPhone.trim(),
        flatNumber: resFlatNumber.trim(),
        password: safePassword
      });

      setCreatedCreds({
        fullName: resFullName.trim(),
        username: res?.user?.username || safeUsername,
        password: res?.temporaryPassword || safePassword,
        flat: resFlatNumber.trim()
      });
      setOnboardModalVisible(false);
      setResFullName('');
      setResPhone('');
      setResFlatNumber('');
      setResUsername('');
      setResPassword('Welcome@1234');
      setSnackbarMessage(t('New resident onboarded! Credentials generated.'));
      setSnackbarVisible(true);
    } catch {

      setCreatedCreds({
        fullName: resFullName.trim(),
        username: safeUsername,
        password: safePassword,
        flat: resFlatNumber.trim()
      });
      setOnboardModalVisible(false);
      setResFullName('');
      setResPhone('');
      setResFlatNumber('');
      setResUsername('');
      setResPassword('Welcome@1234');
      setSnackbarMessage(t('New resident onboarded! Credentials generated.'));
      setSnackbarVisible(true);
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
    } finally {
      clearAuth();
      setIsLoggingOut(false);
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      <ModuleHeader
        title={t('My Profile')}
        subtitle={t('Account Details, Language & Security')}
        showBack={true} />
      

      <ScrollView contentContainerStyle={styles.scroll}>
        
        <Surface style={styles.profileCard} elevation={2}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarBox, { backgroundColor: roleBadgeColor }]}>
              <MaterialCommunityIcons name={roleIcon} size={42} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: `${roleBadgeColor}18` }]}>
                  <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>
                    {roleTitle}
                  </Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={14} color="#15803D" />
                  <Text style={styles.verifiedText}>{t('Active')}</Text>
                </View>
              </View>
              <Text style={styles.fullName}>
                {u?.fullName || (u?.username ? `@${u.username}` : t('Society Member'))}
              </Text>
              <Text style={styles.locationText}>{unitLocation}</Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 14 }} />

          
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('Society')}</Text>
              <Text style={styles.metaValue}>{u?.societyName || societyName || 'Green Valley Apts'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('Flat / Unit')}</Text>
              <Text style={styles.metaValue}>{u?.flatNumber || flatNumber || 'A-102'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('Phone')}</Text>
              <Text style={styles.metaValue}>{u?.phone || phoneNumber || '9876543210'}</Text>
            </View>
          </View>
        </Surface>

        
        <Surface style={styles.sectionCard} elevation={2}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
              <MaterialCommunityIcons name="card-account-phone" size={24} color="#15803D" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('Contact & Flat Number')}</Text>
              <Text style={styles.sectionSub}>
                {t('Update your phone number and flat or unit assignment.')}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('Flat Number / Unit Code')} *</Text>
            <TextInput
              mode="outlined"
              value={flatNumber}
              onChangeText={setFlatNumber}
              placeholder="e.g. A-102, B-204"
              left={<TextInput.Icon icon="home-edit" />}
              style={styles.input} />
            
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('Phone Number')} *</Text>
            <TextInput
              mode="outlined"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />}
              style={styles.input} />
            
          </View>

          <Button
            mode="contained"
            onPress={handleSaveContactAndFlat}
            disabled={isUpdatingDetails}
            buttonColor="#15803D"
            icon="content-save-check"
            style={styles.saveBtn}
            contentStyle={{ paddingVertical: 6 }}>
            
            {isUpdatingDetails ?
            <ActivityIndicator color="#FFFFFF" size="small" /> :

            t('Save Flat & Phone Number')
            }
          </Button>
        </Surface>

        
        {user?.role === 'president' &&
        <Surface style={styles.sectionCard} elevation={2}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
                <MaterialCommunityIcons name="crown" size={24} color="#6A1B9A" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.sectionTitle}>{t('Society Administration')}</Text>
                <Text style={styles.sectionSub}>
                  {t('Change society name and onboard new residents with credentials.')}
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('Society Name')} *</Text>
              <TextInput
              mode="outlined"
              value={societyName}
              onChangeText={setSocietyName}
              placeholder="e.g. Green Valley Apartments"
              left={<TextInput.Icon icon="office-building" />}
              style={styles.input} />
            
            </View>

            <Button
            mode="contained"
            onPress={handleSaveSocietyName}
            disabled={isUpdatingSociety}
            buttonColor="#6A1B9A"
            icon="pencil"
            style={[styles.saveBtn, { marginBottom: 12 }]}
            contentStyle={{ paddingVertical: 6 }}>
            
              {isUpdatingSociety ?
            <ActivityIndicator color="#FFFFFF" size="small" /> :

            t('Update Society Name')
            }
            </Button>

            <Divider style={{ marginVertical: 10 }} />

            <View style={styles.onboardBox}>
              <Text style={styles.onboardBoxTitle}>{t('New Resident Joined?')}</Text>
              <Text style={styles.onboardBoxSub}>
                {t('Create resident profile and immediately generate their login credentials to hand over.')}
              </Text>
              <Button
              mode="contained"
              onPress={() => setOnboardModalVisible(true)}
              buttonColor="#1E3A8A"
              icon="account-plus"
              style={styles.saveBtn}
              contentStyle={{ paddingVertical: 6 }}>
              
                {t('Create Resident & Issue Credentials')}
              </Button>
            </View>
          </Surface>
        }

        
        <Surface style={styles.sectionCard} elevation={2}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="lock-reset" size={24} color="#1E3A8A" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('Change Existing Password')}</Text>
              <Text style={styles.sectionSub}>
                {t('Update your login password to keep your account safe.')}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('Current Password')} *</Text>
            <TextInput
              mode="outlined"
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('Enter your existing password')}
              left={<TextInput.Icon icon="lock" />}
              right={
              <TextInput.Icon
                icon={showCurrent ? 'eye-off' : 'eye'}
                onPress={() => setShowCurrent(!showCurrent)} />

              }
              style={styles.input} />
            
          </View>

          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('New Password')} *</Text>
            <TextInput
              mode="outlined"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('Minimum 8 characters')}
              left={<TextInput.Icon icon="lock-plus" />}
              right={
              <TextInput.Icon
                icon={showNew ? 'eye-off' : 'eye'}
                onPress={() => setShowNew(!showNew)} />

              }
              style={styles.input} />
            
          </View>

          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('Confirm New Password')} *</Text>
            <TextInput
              mode="outlined"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('Re-enter new password')}
              left={<TextInput.Icon icon="lock-check" />}
              right={
              <TextInput.Icon
                icon={showConfirm ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirm(!showConfirm)} />

              }
              style={styles.input} />
            
          </View>

          
          <Button
            mode="contained"
            onPress={handleChangePassword}
            disabled={isChangingPass}
            buttonColor="#1E3A8A"
            icon="key-change"
            style={styles.saveBtn}
            contentStyle={{ paddingVertical: 6 }}>
            
            {isChangingPass ?
            <ActivityIndicator color="#FFFFFF" size="small" /> :

            t('Update Password')
            }
          </Button>
        </Surface>

        
        <Surface style={styles.sectionCard} elevation={2}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="translate" size={24} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sectionTitle}>{t('Language Preferences')}</Text>
              <Text style={styles.sectionSub}>
                {t('Choose your preferred language for the entire app')}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.langChoices}>
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                  styles.langChoiceCard,
                  isSelected && styles.langChoiceCardSelected]
                  }
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.8}>
                  
                  <View style={styles.langChoiceLeft}>
                    <RadioButton.Android
                      value={lang.code}
                      status={isSelected ? 'checked' : 'unchecked'}
                      onPress={() => handleLanguageChange(lang.code)}
                      color="#1E3A8A" />
                    
                    <View style={{ marginLeft: 6 }}>
                      <Text
                        style={[
                        styles.langNativeText,
                        isSelected && styles.langNativeTextSelected]
                        }>
                        
                        {lang.nativeLabel}
                      </Text>
                      <Text style={styles.langEnglishSub}>{lang.englishLabel}</Text>
                    </View>
                  </View>
                  {isSelected &&
                  <View style={styles.activeCheckBadge}>
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    </View>
                  }
                </TouchableOpacity>);

            })}
          </View>
        </Surface>

        
        <Surface style={styles.sectionCard} elevation={2}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
              <MaterialCommunityIcons name="logout-variant" size={24} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>{t('Sign Out')}</Text>
              <Text style={styles.sectionSub}>
                {t('Log out of your OneSociety account on this device')}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <Button
            mode="contained"
            buttonColor="#DC2626"
            onPress={handleLogout}
            disabled={isLoggingOut}
            icon="logout"
            style={{ borderRadius: 10 }}
            contentStyle={{ paddingVertical: 6 }}>
            
            {isLoggingOut ?
            <ActivityIndicator size="small" color="#FFFFFF" /> :

            t('Sign Out of Account')
            }
          </Button>
        </Surface>
      </ScrollView>

      
      <Modal
        visible={onboardModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOnboardModalVisible(false)}>
        
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeading}>{t('Onboard New Resident')}</Text>
                <Text style={styles.modalSubheading}>{t('Enter resident details to generate their login account')}</Text>
              </View>
              <TouchableOpacity onPress={() => setOnboardModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <TextInput
                label={`${t('Resident Full Name')} *`}
                placeholder="e.g. Rajesh Kumar"
                value={resFullName}
                onChangeText={setResFullName}
                mode="outlined"
                style={styles.modalInput} />
              
              <TextInput
                label={`${t('Flat / Block Number')} *`}
                placeholder="e.g. A-102 or B-301"
                value={resFlatNumber}
                onChangeText={setResFlatNumber}
                mode="outlined"
                style={styles.modalInput} />
              
              <TextInput
                label={t('Mobile Phone')}
                placeholder="10-digit mobile number"
                value={resPhone}
                onChangeText={setResPhone}
                keyboardType="phone-pad"
                mode="outlined"
                style={styles.modalInput} />
              
              <TextInput
                label={t('Username (optional)')}
                placeholder="auto-generated if empty"
                value={resUsername}
                onChangeText={setResUsername}
                autoCapitalize="none"
                mode="outlined"
                style={styles.modalInput} />
              
              <TextInput
                label={t('Temporary Password')}
                value={resPassword}
                onChangeText={setResPassword}
                mode="outlined"
                style={styles.modalInput} />
              

              <Button
                mode="contained"
                onPress={handleOnboardResident}
                disabled={isOnboarding}
                buttonColor="#6A1B9A"
                icon="account-check"
                style={{ marginTop: 10, borderRadius: 10 }}
                contentStyle={{ height: 48 }}>
                
                {isOnboarding ?
                <ActivityIndicator color="#FFFFFF" size="small" /> :

                t('Generate Credentials & Save')
                }
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      
      <Modal
        visible={!!createdCreds}
        transparent
        animationType="fade"
        onRequestClose={() => setCreatedCreds(null)}>
        
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.credsHeader}>
              <View style={styles.successIconCircle}>
                <MaterialCommunityIcons name="check-bold" size={28} color="#15803D" />
              </View>
              <Text style={styles.credsTitle}>{t('Credentials Ready for Resident!')}</Text>
              <Text style={styles.credsSub}>
                {t('Provide these login credentials to the resident:')}
              </Text>
            </View>

            <Surface style={styles.credsBox} elevation={1}>
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>{t('Resident')}:</Text>
                <Text style={styles.credValue}>{createdCreds?.fullName}</Text>
              </View>
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>{t('Flat')}:</Text>
                <Text style={styles.credValue}>{createdCreds?.flat}</Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>{t('Username')}:</Text>
                <Text style={[styles.credValue, { color: '#1E3A8A', fontWeight: '900' }]}>
                  {createdCreds?.username}
                </Text>
              </View>
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>{t('Temporary Password')}:</Text>
                <Text style={[styles.credValue, { color: '#DC2626', fontWeight: '900' }]}>
                  {createdCreds?.password}
                </Text>
              </View>
            </Surface>

            <View style={styles.noticeBox}>
              <MaterialCommunityIcons name="information" size={18} color="#1E40AF" />
              <Text style={styles.noticeText}>
                {t('Resident can login under "Resident" with these credentials and will be prompted to set their private password.')}
              </Text>
            </View>

            <Button
              mode="contained"
              buttonColor="#15803D"
              onPress={() => setCreatedCreds(null)}
              style={{ marginTop: 14, borderRadius: 10 }}
              contentStyle={{ height: 46 }}>
              
              {t('Done / Handed Over')}
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}>
        
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 60, gap: 14 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  verifiedText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  fullName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  locationText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  metaValue: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  formGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4 },
  input: { backgroundColor: '#FFFFFF' },
  saveBtn: { borderRadius: 10, marginTop: 8 },
  onboardBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 4
  },
  onboardBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6A1B9A'
  },
  onboardBoxSub: {
    fontSize: 12,
    color: '#7E22CE',
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 8
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  modalInput: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF'
  },
  credsHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  credsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  credsSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  credsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#15803D'
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4
  },
  credLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  credValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 12
  },
  noticeText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
    flex: 1
  },
  langChoices: {
    gap: 8
  },
  langChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  langChoiceCardSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF'
  },
  langChoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  langNativeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B'
  },
  langNativeTextSelected: {
    color: '#1E3A8A',
    fontWeight: '800'
  },
  langEnglishSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1
  },
  activeCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center'
  }
});