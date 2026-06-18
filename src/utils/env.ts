export const isNativeApp = typeof window !== 'undefined' && (
  window.navigator.userAgent.toLowerCase().includes('electron') ||
  (window as any).process?.versions?.electron !== undefined
);
