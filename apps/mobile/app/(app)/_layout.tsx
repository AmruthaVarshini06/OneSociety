import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth';
import { getNotifications } from '../../src/services/notifications';

export default function AppLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: () => getNotifications({ limit: 1 }),
    enabled: !!accessToken,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  useEffect(() => {
    if (!accessToken) {
      router.replace('/(auth)/login');
      return;
    }
    if (user?.mustChangePassword) {
      router.replace('/(auth)/change-password');
    }
  }, [accessToken, user?.mustChangePassword]);

  if (!accessToken) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications.title'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={size}
              color={color}
            />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="complaints" options={{ href: null }} />
      <Tabs.Screen name="group-orders" options={{ href: null }} />
      <Tabs.Screen name="guard" options={{ href: null }} />
      <Tabs.Screen name="rentals" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="society-help" options={{ href: null }} />
      <Tabs.Screen name="suppliers" options={{ href: null }} />
    </Tabs>
  );
}
