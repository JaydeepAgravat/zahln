export type OnboardingStackParamList = {
  Welcome: undefined;
  Phone: undefined;
  Otp: undefined;
  Name: undefined;
  Merchant: undefined;
  PinCreate: undefined;
  PinConfirm: undefined;
  Biometrics: undefined;
};

export type ConsumerTabParamList = { Wallet: undefined; Settings: undefined };
export type MerchantTabParamList = { Till: undefined; MerchantWallet: undefined; Settings: undefined };

declare global {
  namespace ReactNavigation {
    interface RootParamList extends OnboardingStackParamList {}
  }
}
