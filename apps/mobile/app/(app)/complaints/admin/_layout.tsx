import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../../../src/store/auth';

export default function ComplaintsAdminLayout() {
  const user = useAuthStore((s) => s.user);

  if (user && user.role !== 'president') {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
