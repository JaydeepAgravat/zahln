package de.zahln.nfcpay

import android.content.ComponentName
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import com.facebook.react.bridge.ReactApplicationContext

class NfcPayModule(context: ReactApplicationContext) : NativeNfcPaySpec(context) {
  private val adapter: NfcAdapter? get() = NfcAdapter.getDefaultAdapter(reactApplicationContext)

  override fun getName() = NAME

  override fun isSupported(): Boolean =
    adapter != null && reactApplicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)

  override fun isEnabled(): Boolean = adapter?.isEnabled == true

  // ---------- Till: card emulation ----------

  override fun startEmulating(ref: String) {
    PaymentApduService.currentRef = ref
    setServiceEnabled(true)
  }

  override fun stopEmulating() {
    PaymentApduService.currentRef = null
    setServiceEnabled(false)
  }

  private fun setServiceEnabled(enabled: Boolean) {
    reactApplicationContext.packageManager.setComponentEnabledSetting(
      ComponentName(reactApplicationContext, PaymentApduService::class.java),
      if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
      PackageManager.DONT_KILL_APP,
    )
  }

  // ---------- Payer: reader mode ----------

  override fun startReading() {
    val activity = reactApplicationContext.currentActivity ?: return
    val nfc = adapter ?: return
    activity.runOnUiThread {
      nfc.enableReaderMode(
        activity,
        { tag -> read(tag) },
        NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK or NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
        null,
      )
    }
  }

  override fun stopReading() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread { adapter?.disableReaderMode(activity) }
  }

  /** Runs on a binder thread: one SELECT, one answer, done. */
  private fun read(tag: Tag) {
    val iso = IsoDep.get(tag) ?: return emitOnTagError("not_iso_dep")
    try {
      iso.connect()
      iso.timeout = 2000
      val ref = Apdu.parse(iso.transceive(Apdu.select()))
      if (ref != null) emitOnTagRead(ref) else emitOnTagError("no_open_payment")
    } catch (e: Exception) {
      emitOnTagError("io:${e.javaClass.simpleName}")
    } finally {
      runCatching { iso.close() }
    }
  }

  override fun invalidate() {
    stopEmulating()
    super.invalidate()
  }

  companion object {
    const val NAME = "ZahlnNfcPay"
  }
}
