jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      getString: (k) => store.get(k),
      set: (k, v) => store.set(k, v),
      remove: (k) => store.delete(k),
    }),
  };
});

jest.mock('react-native-keychain', () => {
  const items = new Map();
  return {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
    ACCESS_CONTROL: { BIOMETRY_CURRENT_SET: 'BiometryCurrentSet' },
    SECURITY_LEVEL: { SECURE_HARDWARE: 'SECURE_HARDWARE' },
    setGenericPassword: async (username, password, { service }) => {
      items.set(service, { username, password });
      return { service };
    },
    getGenericPassword: async ({ service }) => items.get(service) ?? false,
    resetGenericPassword: async ({ service }) => items.delete(service),
    getSupportedBiometryType: async () => 'FaceID',
  };
});
