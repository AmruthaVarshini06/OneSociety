import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../../../src/store/auth';

export default function ProviderPortalLayout() {
  const user = useAuthStore((s) => s.user);

  if (user && !['provider_internal', 'provider_external', 'president'].includes(user.role)) {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
