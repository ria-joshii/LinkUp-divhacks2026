import { router } from 'expo-router';

export function resetTo(href: '/' | '/home' | '/profile' | '/texted') {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace(href);
}
