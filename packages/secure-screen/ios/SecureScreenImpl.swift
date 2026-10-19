import UIKit

/**
 * iOS has no public API to block screenshots. What it does allow:
 * (a) cover the window before the app-switcher snapshot is taken (willResignActive),
 * (b) know when the screen is being recorded or mirrored (UIScreen.isCaptured),
 * (c) be told after a screenshot was taken.
 */
@objc(SecureScreenImpl)
public final class SecureScreenImpl: NSObject {
  @objc public var onCaptureChanged: ((Bool) -> Void)?
  @objc public var onScreenshot: (() -> Void)?

  private var protectCount = 0
  private var cover: UIView?
  private var observers: [NSObjectProtocol] = []

  @objc public override init() {
    super.init()
    let center = NotificationCenter.default
    observers = [
      center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.showCover()
      },
      center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.hideCover()
      },
      center.addObserver(forName: UIScreen.capturedDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
        self?.onCaptureChanged?(Self.captured)
      },
      center.addObserver(forName: UIApplication.userDidTakeScreenshotNotification, object: nil, queue: .main) { [weak self] _ in
        self?.onScreenshot?()
      },
    ]
  }

  deinit {
    observers.forEach(NotificationCenter.default.removeObserver)
  }

  @objc public func enable() {
    DispatchQueue.main.async { self.protectCount += 1 }
  }

  @objc public func disable() {
    DispatchQueue.main.async {
      self.protectCount = max(0, self.protectCount - 1)
      if self.protectCount == 0 { self.hideCover() }
    }
  }

  @objc public static var captured: Bool {
    UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.screen.isCaptured }
      .contains(true)
  }

  @objc public func isCaptured() -> Bool {
    Thread.isMainThread ? Self.captured : DispatchQueue.main.sync { Self.captured }
  }

  private var keyWindow: UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)
  }

  private func showCover() {
    guard protectCount > 0, cover == nil, let window = keyWindow else { return }
    let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemThickMaterial))
    blur.frame = window.bounds
    blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    blur.accessibilityElementsHidden = true
    window.addSubview(blur)
    cover = blur
  }

  private func hideCover() {
    cover?.removeFromSuperview()
    cover = nil
  }

  /** Jailbreak heuristics: well-known files, and whether we can write outside the sandbox. Easy to fool on purpose. */
  @objc public func integrity() -> [String: Any] {
    var signals: [String] = []
    #if targetEnvironment(simulator)
      let emulator = true
    #else
      let emulator = false
      let paths = [
        "/Applications/Cydia.app", "/Applications/Sileo.app", "/bin/bash", "/usr/sbin/sshd",
        "/etc/apt", "/private/var/lib/apt", "/var/jb",
      ]
      for path in paths where FileManager.default.fileExists(atPath: path) {
        signals.append("file:\(path)")
      }
      let probe = "/private/zaster-jb-probe.txt"
      if (try? "x".write(toFile: probe, atomically: true, encoding: .utf8)) != nil {
        signals.append("sandbox:writable")
        try? FileManager.default.removeItem(atPath: probe)
      }
    #endif
    return ["rooted": !signals.isEmpty, "emulator": emulator, "signals": signals]
  }
}
