package de.zahln.nfcpay

/** The tiny protocol between a till (card) and a payer (reader). */
object Apdu {
  /** "ZAHLN" + version 1, under the proprietary F0 prefix. */
  val AID = byteArrayOf(0xF0.toByte(), 0x5A, 0x41, 0x48, 0x4C, 0x4E, 0x01)
  val OK = byteArrayOf(0x90.toByte(), 0x00)
  val NOT_FOUND = byteArrayOf(0x6A, 0x82.toByte())
  val UNKNOWN = byteArrayOf(0x6F, 0x00)

  /** SELECT by AID: 00 A4 04 00 Lc AID Le */
  fun select(): ByteArray = byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00, AID.size.toByte()) + AID + byteArrayOf(0x00)

  fun isSelectOurs(apdu: ByteArray): Boolean =
    apdu.size >= 5 + AID.size &&
      apdu[0] == 0x00.toByte() && apdu[1] == 0xA4.toByte() && apdu[2] == 0x04.toByte() &&
      apdu.copyOfRange(5, 5 + AID.size).contentEquals(AID)

  /** Response = UTF-8 reference + 90 00. Anything else means "no open payment here". */
  fun parse(response: ByteArray): String? {
    if (response.size < 2) return null
    val status = response.copyOfRange(response.size - 2, response.size)
    if (!status.contentEquals(OK)) return null
    return String(response, 0, response.size - 2, Charsets.UTF_8).takeIf { it.isNotBlank() }
  }
}
