import { useRouter as useExpoRouter } from 'expo-router';

// Module-level lock prevents simultaneous presses from opening duplicate screens.
// All components share the same flag so pressing two things at once only fires once.
let _navigating = false;

function guard(fn: () => void) {
  if (_navigating) return;
  _navigating = true;
  fn();
  setTimeout(() => {
    _navigating = false;
  }, 600);
}

export function useRouter() {
  const router = useExpoRouter();

  return {
    ...router,
    push: ((...args: Parameters<typeof router.push>) => guard(() => router.push(...args))) as typeof router.push,
    navigate: ((...args: Parameters<typeof router.navigate>) => guard(() => router.navigate(...args))) as typeof router.navigate,
    // replace and back are intentional single-fire actions — no guard needed
    replace: router.replace.bind(router),
    back: router.back.bind(router),
  };
}
