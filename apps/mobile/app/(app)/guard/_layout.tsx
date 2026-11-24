import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';

export default function GuardLayout() {
  const user = useAuthStore((s) => s.user);

  if (user && user.role !== 'guard' && user.role !== 'president') {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1E3A8A' }, headerTintColor: '#FFFFFF', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="gate-dashboard" options={{ title: 'Gate Security Live' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Pass / Verify' }} />
      <Stack.Screen name="manual-log" options={{ title: 'Visitor Notepad' }} />
      <Stack.Screen name="currently-inside" options={{ title: 'Currently Inside' }} />
      <Stack.Screen name="flat-search" options={{ title: 'Check Flat Presence' }} />
      <Stack.Screen name="events" options={{ title: 'Society Events' }} />
      <Stack.Screen name="handover" options={{ title: 'Shift Handover' }} />
      <Stack.Screen name="salary" options={{ title: 'My Salary Records' }} />
      <Stack.Screen name="deliveries" options={{ title: 'Gate Deliveries' }} />
    </Stack>
  );
}
