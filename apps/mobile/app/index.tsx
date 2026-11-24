import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function RootIndex() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!user || !accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)/home" />;
}
