import { Stack } from 'expo-router';

export default function SuppliersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Suppliers' }} />
      <Stack.Screen name="create" options={{ title: 'Add Supplier' }} />
      <Stack.Screen name="[id]" options={{ title: 'Supplier Details' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
    </Stack>
  );
}
