package de.zaster.nfcpay

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * The till as a contactless "card": a reader that selects our AID gets the open payment's reference
 * (the same signed reference the QR carries, never an amount or an account). Nothing else is answered.
 */
class PaymentApduService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray, extras: Bundle?): ByteArray {
    if (!Apdu.isSelectOurs(commandApdu)) return Apdu.UNKNOWN
    val ref = currentRef ?: return Apdu.NOT_FOUND
    return ref.toByteArray(Charsets.UTF_8) + Apdu.OK
  }

  override fun onDeactivated(reason: Int) = Unit

  companion object {
    @Volatile var currentRef: String? = null
  }
}
