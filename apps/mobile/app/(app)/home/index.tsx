import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';

export default function HomeIndex() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)/login" />;

  switch (user.role) {
    case 'resident':
      return <Redirect href="/(app)/home/resident" />;
    case 'president':
      return <Redirect href="/(app)/home/president" />;
    case 'guard':
      return <Redirect href="/(app)/home/guard" />;
    case 'supplier':
      return <Redirect href="/(app)/home/supplier" />;
    case 'provider_internal':
    case 'provider_external':
      return <Redirect href="/(app)/home/provider" />;
    case 'delivery_partner':
      return <Redirect href="/(app)/home/delivery" />;
    default:
      return <Redirect href="/(app)/home/resident" />;
  }
}
