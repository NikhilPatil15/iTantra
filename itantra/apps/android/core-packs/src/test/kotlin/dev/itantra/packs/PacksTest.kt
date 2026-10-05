package dev.itantra.packs

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class PacksTest {
    private fun dataFile(name: String): File {
        val candidates = listOf(File("../../../files/packs"), File("files/packs"), File("../../files/packs"))
        val root = candidates.firstOrNull { it.isDirectory }
            ?: error("could not locate files/packs from ${File(".").absolutePath}")
        return File(root, name)
    }

    @Test
    fun codebookLookupReturnsTheReceiversText() {
        val codebook = CodebookLoader.load(dataFile("hi/codebook.hi.json"))
        val found = assertIs<PhraseLookup.Found>(codebook.lookup(1, expectedVersion = codebook.version))
        assertEquals("मदद चाहिए", found.text)
    }

    @Test
    fun codebookVersionMismatchAndUnknownIdAreDistinct() {
        val codebook = CodebookLoader.load(dataFile("hi/codebook.hi.json"))
        assertIs<PhraseLookup.VersionMismatch>(codebook.lookup(1, expectedVersion = codebook.version + 1))
        assertIs<PhraseLookup.NotFound>(codebook.lookup(99, expectedVersion = codebook.version))
    }

    @Test
    fun criticalGuardFlagsNumbersAndLexiconWords() {
        val guard = CriticalGuard.load(dataFile("hi/critical.hi.json"))
        val result = guard.evaluate(
            listOf(
                GuardToken("दो", 0.62, low = true),
                GuardToken("लोग", 0.90, low = false),
                GuardToken("पानी", 0.42, low = true),
                GuardToken("घायल", 0.88, low = false),
            ),
        )
        assertEquals(listOf(true, false, true, true), result.criticalFlags)
        assertTrue(result.forcedConfirm, "a low-confidence critical word must force confirmation")
        assertEquals(listOf("दो", "पानी", "घायल"), result.criticalWords)
    }

    @Test
    fun digitsAreAlwaysCritical() {
        val guard = CriticalGuard.load(dataFile("hi/critical.hi.json"))
        assertTrue(guard.isCritical("12"))
        val result = guard.evaluate(listOf(GuardToken("12", 0.2, low = true)))
        assertTrue(result.forcedConfirm)
    }

    @Test
    fun englishLexiconLoadsToo() {
        val guard = CriticalGuard.load(dataFile("en/critical.en.json"))
        assertTrue(guard.isCritical("water"))
        assertTrue(!guard.isCritical("hello"))
    }
}
