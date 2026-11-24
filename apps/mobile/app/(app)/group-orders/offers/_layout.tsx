import { Stack } from 'expo-router';

export default function OffersLayout() {
  return (
    <Stack>
      <Stack.Screen name="submit" options={{ title: 'Submit Offer' }} />
      <Stack.Screen name="mine"   options={{ title: 'My Offer' }} />
      <Stack.Screen name="list"   options={{ title: 'All Offers' }} />
    </Stack>
  );
}
