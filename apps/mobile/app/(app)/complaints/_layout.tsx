import { Stack } from 'expo-router';

export default function ComplaintsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Complaints Feed' }} />
      <Stack.Screen name="new" options={{ title: 'Report an Issue' }} />
      <Stack.Screen name="[id]" options={{ title: 'Issue Details' }} />
      <Stack.Screen name="admin/index" options={{ title: 'President Dashboard' }} />
      <Stack.Screen name="admin/action/[id]" options={{ title: 'Manage Issue' }} />
      <Stack.Screen name="admin/vendors" options={{ title: 'Local Vendors Directory' }} />
      <Stack.Screen name="admin/reports" options={{ title: 'Complaints Analytics' }} />
    </Stack>
  );
}
