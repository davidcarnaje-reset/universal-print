export const isNativeApp = typeof window !== 'undefined' && (
  window.navigator.userAgent.toLowerCase().includes('electron') ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).process?.versions?.electron !== undefined
);

