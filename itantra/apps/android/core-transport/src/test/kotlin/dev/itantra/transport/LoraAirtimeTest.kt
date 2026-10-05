package dev.itantra.transport

import kotlin.test.Test
import kotlin.test.assertTrue

class LoraAirtimeTest {
    // Semtech SF11 / 250 kHz / CR 4/5 / 16-symbol preamble / explicit header / CRC on.
    // Values from the research doc; recheck against a LoRa airtime calculator and record the source.
    private val model = AirtimeModel(
        spreadingFactor = 11,
        bandwidthHz = 250_000,
        codingRateDenominator = 5,
        preambleSymbols = 16,
        explicitHeader = true,
        crc = true,
    )

    @Test
    fun hundredBytePayloadIsAboutOneSecond() {
        val ms = LoraAirtime.airtimeMs(100, model)
        assertTrue(ms in 900.0..1150.0, "100 B airtime was $ms ms")
    }

    @Test
    fun twoThirtySevenBytePayloadIsAboutTwoSeconds() {
        val ms = LoraAirtime.airtimeMs(237, model)
        assertTrue(ms in 1850.0..2250.0, "237 B airtime was $ms ms")
    }

    @Test
    fun airtimeGrowsWithPayload() {
        assertTrue(LoraAirtime.airtimeMs(200, model) > LoraAirtime.airtimeMs(50, model))
    }
}
