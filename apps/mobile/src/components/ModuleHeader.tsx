import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}

export function ModuleHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  backgroundColor = '#FFFFFF',
  textColor = '#0F172A'
}: ModuleHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const getRoleHome = (role?: string) => {
    switch (role) {
      case 'resident':
        return '/(app)/home/resident';
      case 'president':
        return '/(app)/home/president';
      case 'guard':
        return '/(app)/home/guard';
      case 'supplier':
        return '/(app)/home/supplier';
      case 'provider_internal':
      case 'provider_external':
        return '/(app)/home/provider';
      case 'delivery_partner':
        return '/(app)/home/delivery';
      default:
        return '/(app)/home/resident';
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    const roleHome = getRoleHome(user?.role);
    const cleanPath = (pathname || '').toLowerCase().replace(/\/$/, '');

    const isModuleRoot =
    cleanPath === '/(app)/group-orders' ||
    cleanPath === '/group-orders' ||
    cleanPath === '/(app)/complaints' ||
    cleanPath === '/complaints' ||
    cleanPath === '/(app)/rentals' ||
    cleanPath === '/rentals' ||
    cleanPath === '/(app)/services' ||
    cleanPath === '/services' ||
    cleanPath === '/(app)/society-help' ||
    cleanPath === '/society-help' ||
    cleanPath === '/(app)/suppliers' ||
    cleanPath === '/suppliers' ||
    cleanPath === '/(app)/guard' ||
    cleanPath === '/guard' ||
    cleanPath === '/(app)/guard/gate-dashboard' ||
    cleanPath === '/(app)/notifications' ||
    cleanPath === '/notifications' ||
    cleanPath === '/(app)/profile' ||
    cleanPath === '/profile';

    if (isModuleRoot) {
      router.replace(roleHome as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (cleanPath.includes('/group-orders')) {
      router.replace('/(app)/group-orders' as any);
    } else if (cleanPath.includes('/complaints')) {
      router.replace('/(app)/complaints' as any);
    } else if (cleanPath.includes('/rentals')) {
      router.replace('/(app)/rentals' as any);
    } else if (cleanPath.includes('/services')) {
      router.replace('/(app)/services' as any);
    } else if (cleanPath.includes('/society-help')) {
      router.replace('/(app)/society-help' as any);
    } else if (cleanPath.includes('/suppliers')) {
      router.replace('/(app)/suppliers' as any);
    } else if (cleanPath.includes('/guard')) {
      router.replace('/(app)/guard/gate-dashboard' as any);
    } else {
      router.replace(roleHome as any);
    }
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor }]}>
      <View style={styles.leftRow}>
        {showBack &&
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel={t('Go Back')}
          accessibilityRole="button">
          
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        }
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {t(title)}
          </Text>
          {subtitle ?
          <Text style={styles.subtitle} numberOfLines={1}>
              {t(subtitle)}
            </Text> :
          null}
        </View>
      </View>

      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>);

}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 56
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1
  },
  rightContainer: {
    marginLeft: 8
  }
});

export default ModuleHeader;