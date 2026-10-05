package dev.itantra.protocol

import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * ChaCha20-Poly1305 via the JDK provider. The shipping app uses the audited Android binding
 * (Tink/libsodium, plan Section 3.2); this implementation exists so the pure-JVM tests and the
 * Kotlin CLI can reproduce the committed vectors on a desktop.
 */
class ChaCha20Poly1305Aead : Aead {
    override fun seal(key: ByteArray, nonce: ByteArray, aad: ByteArray, plaintext: ByteArray): ByteArray {
        require(key.size == 32) { "ChaCha20-Poly1305 requires a 32-byte key" }
        require(nonce.size == 12) { "ChaCha20-Poly1305 requires a 12-byte nonce" }
        val cipher = Cipher.getInstance("ChaCha20-Poly1305")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "ChaCha20"), IvParameterSpec(nonce))
        cipher.updateAAD(aad)
        return cipher.doFinal(plaintext)
    }

    override fun open(key: ByteArray, nonce: ByteArray, aad: ByteArray, ciphertext: ByteArray): ByteArray {
        require(ciphertext.size >= TAG_BYTES) { "ciphertext shorter than tag" }
        val cipher = Cipher.getInstance("ChaCha20-Poly1305")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "ChaCha20"), IvParameterSpec(nonce))
        cipher.updateAAD(aad)
        return try {
            cipher.doFinal(ciphertext)
        } catch (e: AEADBadTagException) {
            throw SecurityException("AEAD authentication failed", e)
        }
    }
}
