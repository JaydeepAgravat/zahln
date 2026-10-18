// The interface lives here, not in a public header: it imports the C++ codegen headers, and a public header
// would end up in this pod's Swift module, which can't compile C++.
#import <ZahlnSecureScreenSpec/ZahlnSecureScreenSpec.h>

#if __has_include(<ZahlnSecureScreen/ZahlnSecureScreen-Swift.h>)
#import <ZahlnSecureScreen/ZahlnSecureScreen-Swift.h>
#else
#import "ZahlnSecureScreen-Swift.h"
#endif

/** The TurboModule. Subclasses the generated base so it can emit events; the work happens in Swift. */
@interface ZahlnSecureScreen : NativeSecureScreenSpecBase <NativeSecureScreenSpec>
@end

@implementation ZahlnSecureScreen {
  SecureScreenImpl *_impl;
}

RCT_EXPORT_MODULE(ZahlnSecureScreen)

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [SecureScreenImpl new];
    __weak ZahlnSecureScreen *weakSelf = self;
    _impl.onCaptureChanged = ^(BOOL captured) {
      [weakSelf emitOnCaptureChanged:captured];
    };
    _impl.onScreenshot = ^{
      [weakSelf emitOnScreenshot];
    };
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)enable
{
  [_impl enable];
}

- (void)disable
{
  [_impl disable];
}

- (NSNumber *)isCaptured
{
  return @([_impl isCaptured]);
}

- (NSDictionary *)integrity
{
  return [_impl integrity];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSecureScreenSpecJSI>(params);
}

@end
