package dev.itantra.store

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room schema v1, plan Section 8. Migrations are explicit; never use destructive fallback in
 * release builds.
 */

@Entity(tableName = "peer")
data class PeerEntity(
    @PrimaryKey val peerId: String,
    val displayName: String,
    val identityPub: ByteArray,
    val senderId: Int,
    /** 'paired' | 'blocked' */
    val trust: String,
    val lastSeenAt: Long?,
    val lastTransport: String?,
)

@Entity(
    tableName = "message",
    foreignKeys = [ForeignKey(entity = PeerEntity::class, parentColumns = ["peerId"], childColumns = ["peerId"])],
    indices = [Index(value = ["peerId", "direction", "senderId", "seq"], unique = true)],
)
data class MessageEntity(
    @PrimaryKey val messageId: String,
    val peerId: String,
    /** 'out' | 'in' */
    val direction: String,
    val senderId: Int,
    val seq: Int,
    val type: Int,
    val priority: Int,
    val lang: Int,
    val text: String?,
    val confBits: ByteArray?,
    val phraseId: Int?,
    val codebookVersion: Int?,
    val createdAt: Long,
    val expiresAt: Long?,
    /** out: QUEUED SENDING SENT ACKED EXPIRED CANCELLED; in: RECEIVED PLAYING PLAYED SHOWN_ONLY MISSED_PREV */
    val state: String,
    val attempts: Int = 0,
    val nextRetryAt: Long?,
    val ackedAt: Long?,
    val playedAt: Long?,
)

@Entity(tableName = "dedupe", primaryKeys = ["peerId", "senderId", "seq"])
data class DedupeEntity(
    val peerId: String,
    val senderId: Int,
    val seq: Int,
    val seenAt: Long,
)

@Entity(tableName = "language_pack")
data class LanguagePackEntity(
    @PrimaryKey val langIndex: Int,
    val packId: String,
    val version: Int,
    /** 'verified' | 'experimental' | 'disabled' */
    val status: String,
    val asrLicenseClass: String?,
    val ttsLicenseClass: String?,
    val sizeBytes: Long?,
    val installedAt: Long?,
)

@Entity(tableName = "metric", primaryKeys = ["runId", "messageId", "name"])
data class MetricEntity(
    val runId: String,
    val messageId: String,
    val name: String,
    val tMillis: Long,
    val value: Double,
)
