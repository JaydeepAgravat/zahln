package de.zaster.securescreen

import android.os.Build
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.io.File

/**
 * Android: FLAG_SECURE on the activity window blocks screenshots and screen recordings and blanks the recents
 * thumbnail. It must be set on the UI thread. Calls are counted so nested sensitive screens don't race.
 */
class SecureScreenModule(context: ReactApplicationContext) : NativeSecureScreenSpec(context) {
  private var protectCount = 0

  override fun getName() = NAME

  override fun enable() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      protectCount += 1
      activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
  }

  override fun disable() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      protectCount = maxOf(0, protectCount - 1)
      if (protectCount == 0) activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
  }

  /** With FLAG_SECURE the recording is black anyway, so there's nothing to hide. */
  override fun isCaptured(): Boolean = false

  /** Root heuristics: su binaries, test-keys builds. Easy to fool on purpose: a hint, never a block. */
  override fun integrity(): WritableMap {
    val signals = Arguments.createArray()
    var rooted = false
    listOf("/system/bin/su", "/system/xbin/su", "/sbin/su", "/su/bin/su", "/data/local/xbin/su", "/system/app/Superuser.apk")
      .filter { File(it).exists() }
      .forEach {
        signals.pushString("file:$it")
        rooted = true
      }
    if (Build.TAGS?.contains("test-keys") == true) {
      signals.pushString("build:test-keys")
      rooted = true
    }
    val emulator = Build.FINGERPRINT.startsWith("generic") ||
      Build.FINGERPRINT.contains("emulator") ||
      Build.MODEL.contains("sdk_gphone") ||
      Build.HARDWARE.contains("ranchu") ||
      Build.HARDWARE.contains("goldfish")
    return Arguments.createMap().apply {
      putBoolean("rooted", rooted)
      putBoolean("emulator", emulator)
      putArray("signals", signals)
    }
  }

  companion object {
    const val NAME = "ZasterSecureScreen"
  }
}
