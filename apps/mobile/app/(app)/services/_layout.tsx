import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'ServiceHub' }} />
      <Stack.Screen name="my-services" options={{ title: 'My Active Services' }} />
      <Stack.Screen name="category/[slug]" options={{ title: 'Browse Providers' }} />
      <Stack.Screen name="provider/[id]" options={{ title: 'Provider Profile' }} />
      <Stack.Screen name="request/new" options={{ title: 'Request Service' }} />
      <Stack.Screen name="request/[id]" options={{ title: 'Request Details' }} />
      <Stack.Screen name="chat/[requestId]" options={{ title: 'Negotiation Chat' }} />
      <Stack.Screen name="agreements/[id]" options={{ title: 'Service Agreement' }} />
      <Stack.Screen name="payments/index" options={{ title: 'Payments' }} />
      <Stack.Screen name="reviews/[requestId]" options={{ title: 'Rate & Review' }} />
      <Stack.Screen name="provider-portal/index" options={{ title: "Today's Schedule" }} />
      <Stack.Screen name="provider-portal/inbox" options={{ title: 'Requests Inbox' }} />
      <Stack.Screen name="provider-portal/schedule" options={{ title: 'My Schedule' }} />
      <Stack.Screen name="provider-portal/availability" options={{ title: 'Availability Settings' }} />
      <Stack.Screen name="provider-portal/earnings" options={{ title: 'Earnings Tracker' }} />
      <Stack.Screen name="provider-portal/profile" options={{ title: 'Provider Profile' }} />
      <Stack.Screen name="provider-portal/reviews" options={{ title: 'Customer Reviews' }} />
      <Stack.Screen name="admin/index" options={{ title: 'ServiceHub Admin' }} />
      <Stack.Screen name="admin/verification-queue" options={{ title: 'Verification Queue' }} />
      <Stack.Screen name="admin/providers" options={{ title: 'All Providers' }} />
      <Stack.Screen name="admin/create-provider" options={{ title: 'Create External Account' }} />
      <Stack.Screen name="admin/complaints" options={{ title: 'Complaints Management' }} />
      <Stack.Screen name="admin/reports" options={{ title: 'Reports & Analytics' }} />
    </Stack>
  );
}
