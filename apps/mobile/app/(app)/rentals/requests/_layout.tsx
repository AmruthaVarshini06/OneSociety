import { Stack } from 'expo-router';

export default function RequestsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Community Wanted Board' }} />
      <Stack.Screen name="create" options={{ title: 'Request an Item' }} />
      <Stack.Screen name="[id]" options={{ title: 'Request Details' }} />
    </Stack>
  );
}
