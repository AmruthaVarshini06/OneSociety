import { Stack } from 'expo-router';

export default function RentalsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Share & Rent' }} />
      <Stack.Screen name="create" options={{ title: 'List an Item' }} />
      <Stack.Screen name="my-items" options={{ title: 'My Listed Items' }} />
      <Stack.Screen name="[id]" options={{ title: 'Item Details' }} />
      <Stack.Screen name="requests" options={{ headerShown: false }} />
      <Stack.Screen name="book" options={{ title: 'Book Item' }} />
      <Stack.Screen name="bookings" options={{ headerShown: false }} />
      <Stack.Screen name="admin/reviews" options={{ title: 'Price Reviews' }} />
      <Stack.Screen name="admin/disputes" options={{ title: 'Dispute Queue' }} />
    </Stack>
  );
}
