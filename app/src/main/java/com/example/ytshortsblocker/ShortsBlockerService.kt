package com.example.ytshortsblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ShortsBlockerService : AccessibilityService() {

    companion object {
        const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        const val PREFS_NAME = "YTBlockerPrefs"
        const val KEY_ENABLED = "blocker_enabled"

        private const val CONTENT_COOLDOWN_MS = 300L
        private const val DEEP_SCAN_COOLDOWN_MS = 800L
        private const val BACK_PRESS_COOLDOWN_MS = 1500L
    }

    private lateinit var prefs: SharedPreferences
    private var lastContentCheckTime = 0L
    private var lastDeepScanTime = 0L
    private var lastBackPressTime = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        RemoteConfig.refreshIfStale(this)

        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.apply {
            eventTypes =
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                AccessibilityEvent.TYPE_VIEW_CLICKED      // catches Shorts tab / video taps
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            notificationTimeout = 50
            packageNames = arrayOf(YOUTUBE_PACKAGE)
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName?.toString() != YOUTUBE_PACKAGE) return
        if (!isBlockerEnabled()) return

        val now = System.currentTimeMillis()

        // Throttle high-frequency content events
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (now - lastContentCheckTime < CONTENT_COOLDOWN_MS) return
            lastContentCheckTime = now
        }

        if (detectShorts(event, now)) pressBack(now)
    }

    private fun detectShorts(event: AccessibilityEvent, now: Long): Boolean {
        val config = RemoteConfig.get(this)

        // ── Strategy 1: class name on window transitions ─────────────────────
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val cls = event.className?.toString() ?: ""
            if (config.classFragments.any { cls.contains(it, ignoreCase = true) }) return true
        }

        // ── Strategy 2: clicked view is Shorts-related ───────────────────────
        // Fires when the user taps the Shorts nav tab or a Short thumbnail.
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val src = event.source
            if (src != null) {
                val text = src.text?.toString() ?: ""
                val cd   = src.contentDescription?.toString() ?: ""
                src.recycle()
                if (text.equals("Shorts", ignoreCase = true) ||
                    cd.equals("Shorts", ignoreCase = true)) return true
            }
        }

        // ── All remaining strategies need the window root ────────────────────
        val root = youtubeRoot() ?: return false

        return try {
            // Strategy 3: fast lookup from remote-config view IDs
            if (containsShortsViewId(root, config.viewIds)) return true

            // Strategy 4: "Shorts" nav tab is currently selected
            if (isShortsNavSelected(root)) return true

            // Strategy 5: URL fragment "/shorts/" visible in tree
            if (containsShortsUrl(root)) return true

            // Strategy 6: deep tree scan (any view ID containing "shorts"/"reel")
            // Throttled to every 800 ms to limit CPU usage
            if (now - lastDeepScanTime > DEEP_SCAN_COOLDOWN_MS) {
                lastDeepScanTime = now
                scanTreeForShortsId(root, 0)
            } else false
        } catch (e: Exception) {
            false
        }
    }

    // ── Root acquisition ─────────────────────────────────────────────────────

    /** Prefers the YouTube window root from getWindows(); falls back to rootInActiveWindow. */
    private fun youtubeRoot(): AccessibilityNodeInfo? {
        windows?.forEach { window ->
            val root = window.root ?: return@forEach
            if (root.packageName?.toString() == YOUTUBE_PACKAGE) return root
            root.recycle()
        }
        return rootInActiveWindow
    }

    // ── Detection strategies ─────────────────────────────────────────────────

    @Suppress("DEPRECATION")
    private fun containsShortsViewId(
        root: AccessibilityNodeInfo,
        viewIds: List<String>
    ): Boolean {
        for (id in viewIds) {
            val nodes = root.findAccessibilityNodeInfosByViewId(id)
            if (!nodes.isNullOrEmpty()) {
                nodes.forEach { it.recycle() }
                return true
            }
        }
        return false
    }

    /**
     * Checks whether the "Shorts" bottom-nav tab is the active/selected item.
     * Inspects the node itself and up to 3 parent levels (YouTube nests tab state
     * differently across versions).
     */
    private fun isShortsNavSelected(root: AccessibilityNodeInfo): Boolean {
        return try {
            val nodes = root.findAccessibilityNodeInfosByText("Shorts")
            var found = false
            outer@ for (node in nodes) {
                try {
                    val text = node.text?.toString() ?: ""
                    val cd   = node.contentDescription?.toString() ?: ""
                    val isShortsLabel =
                        text.equals("Shorts", ignoreCase = true) ||
                        cd.equals("Shorts", ignoreCase = true)
                    if (!isShortsLabel) continue

                    // Walk up to 3 parent levels to find the selected state
                    var cur: AccessibilityNodeInfo? = node
                    var level = 0
                    while (cur != null && level <= 3) {
                        if (cur.isSelected || cur.isChecked) {
                            found = true
                            if (level > 0) cur.recycle()
                            break@outer
                        }
                        val parent = cur.parent
                        if (level > 0) cur.recycle()
                        cur = parent
                        level++
                    }
                    cur?.recycle()
                } finally {
                    node.recycle()
                }
            }
            found
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Searches for the text "/shorts/" anywhere in the accessibility tree.
     * Some YouTube versions expose the video URL in hidden or visible text nodes.
     */
    private fun containsShortsUrl(root: AccessibilityNodeInfo): Boolean {
        return try {
            val nodes = root.findAccessibilityNodeInfosByText("/shorts/")
            val found = !nodes.isNullOrEmpty()
            nodes?.forEach { it.recycle() }
            found
        } catch (e: Exception) {
            false
        }
    }

    /** Recursive scan: true if any view's resource ID contains "shorts" or "reel". */
    private fun scanTreeForShortsId(node: AccessibilityNodeInfo, depth: Int): Boolean {
        if (depth > 12) return false
        val id = node.viewIdResourceName
        if (id != null &&
            (id.contains("shorts", ignoreCase = true) ||
                    id.contains("reel", ignoreCase = true))
        ) return true
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try {
                if (scanTreeForShortsId(child, depth + 1)) return true
            } finally {
                child.recycle()
            }
        }
        return false
    }

    // ── Action ───────────────────────────────────────────────────────────────

    private fun pressBack(now: Long) {
        if (now - lastBackPressTime < BACK_PRESS_COOLDOWN_MS) return
        lastBackPressTime = now
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    private fun isBlockerEnabled(): Boolean =
        if (::prefs.isInitialized) prefs.getBoolean(KEY_ENABLED, true) else true

    override fun onInterrupt() {}
}
