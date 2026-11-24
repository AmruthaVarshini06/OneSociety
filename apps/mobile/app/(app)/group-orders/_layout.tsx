import { Stack } from 'expo-router';

export default function GroupOrdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Group Buying' }} />
      <Stack.Screen name="create" options={{ title: 'Open Demand Window' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Details' }} />
      <Stack.Screen name="payment" options={{ title: 'Order Payment' }} />
      <Stack.Screen name="commitments" options={{ title: 'Order Commitments' }} />
      <Stack.Screen name="dispatch" options={{ title: 'Dispatch Order' }} />
      <Stack.Screen name="pickup" options={{ title: 'Delivery Pass' }} />
      <Stack.Screen name="issue" options={{ title: 'Report Delivery Issue' }} />
      <Stack.Screen name="rate" options={{ title: 'Rate Order & Supplier' }} />
      <Stack.Screen name="supplier-issues" options={{ title: 'Disputes & Issues' }} />
      <Stack.Screen name="settlement" options={{ title: 'Order Settlement' }} />
    </Stack>
  );
}
