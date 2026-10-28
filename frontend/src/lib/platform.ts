import { Capacitor } from '@capacitor/core';

/**
 * Checks if the application is currently running inside the native Android Capacitor shell
 * or if mobile mode is explicitly forced via query param or local storage.
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Native Capacitor container detection
  const isCapacitorNative =
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:';

  // 2. Android WebView detection on localhost
  const isAndroidWebView =
    window.location.hostname === 'localhost' && navigator.userAgent.includes('Android');

  // 3. Optional testing toggle: Allows developers to test mobile view via query or storage
  const urlParams = new URLSearchParams(window.location.search);
  const forceMobileParam = urlParams.get('mode') === 'mobile' || urlParams.get('app') === 'true';
  const forceMobileStorage = localStorage.getItem('libspace_force_mobile_app') === 'true';

  return isCapacitorNative || isAndroidWebView || forceMobileParam || forceMobileStorage;
};
