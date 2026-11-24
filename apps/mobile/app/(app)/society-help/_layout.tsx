import { Stack } from 'expo-router';

export default function SocietyHelpLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Society Help' }} />
      <Stack.Screen name="passes" options={{ title: 'My Passes & Visitor QR' }} />
      <Stack.Screen name="visitor-link/[code]" options={{ title: 'Visitor Pass' }} />
      <Stack.Screen name="maintenance/index" options={{ title: 'Maintenance Accounts' }} />
      <Stack.Screen name="maintenance/pay" options={{ title: 'Pay Maintenance' }} />
      <Stack.Screen name="events/index" options={{ title: 'Community Events' }} />
      <Stack.Screen name="events/new" options={{ title: 'Announce Event' }} />
      <Stack.Screen name="admin/maintenance-control" options={{ title: 'Maintenance Management' }} />
      <Stack.Screen name="admin/queries" options={{ title: 'Expense Queries' }} />
    </Stack>
  );
}
