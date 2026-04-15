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
        const val KEY_DIAG_MODE = "diag_mode"
        const val KEY_DIAG_IDS = "diag_ids"
        const val KEY_DIAG_CLASSES = "diag_classes"

        private const val CONTENT_CHANGE_COOLDOWN_MS = 200L
        private const val BACK_PRESS_COOLDOWN_MS = 1500L
        private const val DIAG_CAPTURE_INTERVAL_MS = 500L

        private val SHORTS_VIEW_IDS = listOf(
            "$YOUTUBE_PACKAGE:id/reel_player_page_container",
            "$YOUTUBE_PACKAGE:id/shorts_container",
            "$YOUTUBE_PACKAGE:id/reel_channel_bar_container",
            "$YOUTUBE_PACKAGE:id/shorts_shelf_item",
            "$YOUTUBE_PACKAGE:id/reel_player_header_container",
            "$YOUTUBE_PACKAGE:id/reel_watch_fragment_container",
            "$YOUTUBE_PACKAGE:id/shorts_player_container",
            "$YOUTUBE_PACKAGE:id/reel_player_id",
            "$YOUTUBE_PACKAGE:id/shorts_video_cell",
            "$YOUTUBE_PACKAGE:id/reel_overlay_container",
            "$YOUTUBE_PACKAGE:id/shorts_pivot_item",
            "$YOUTUBE_PACKAGE:id/reel_player_bottom_panel",
        )

        private val SHORTS_CLASS_FRAGMENTS = listOf(
            "shorts", "Shorts", "reel", "Reel",
            "ReelWatchFragment", "ShortsActivity", "ShortsFragment",
            "com.google.android.apps.youtube.app.shorts",
        )
    }

    private lateinit var prefs: SharedPreferences
    private var lastContentCheckTime = 0L
    private var lastBackPressTime = 0L
    private var lastDiagCaptureTime = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
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
        if (!::prefs.isInitialized) return

        val now = System.currentTimeMillis()

        // Diagnostic capture — runs regardless of blocker state
        if (prefs.getBoolean(KEY_DIAG_MODE, false)) {
            if (now - lastDiagCaptureTime > DIAG_CAPTURE_INTERVAL_MS) {
                lastDiagCaptureTime = now
                rootInActiveWindow?.let { root -> runDiagnostic(root, event) }
            }
        }

        if (!isBlockerEnabled()) return

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (now - lastContentCheckTime < CONTENT_CHANGE_COOLDOWN_MS) return
            lastContentCheckTime = now
        }

        if (detectShorts(event)) {
            pressBack(now)
        }
    }

    private fun detectShorts(event: AccessibilityEvent): Boolean {
        // Strategy 1: class name on window transitions (cheap)
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val cls = event.className?.toString() ?: ""
            if (SHORTS_CLASS_FRAGMENTS.any { cls.contains(it, ignoreCase = true) }) return true
        }

        val root = rootInActiveWindow ?: return false

        return try {
            // Strategy 2: fast lookup of hardcoded known view IDs
            if (containsShortsViewId(root)) return true
            // Strategy 3: Shorts nav tab is the selected/active tab (no internal IDs needed)
            if (isShortsNavSelected(root)) return true
            // Strategy 4: deep tree scan for any "shorts"/"reel" in view IDs
            // Only on state changes to avoid performance hit on frequent content events
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                scanTreeForShortsId(root, 0)
            } else false
        } catch (e: Exception) {
            false
        }
    }

    @Suppress("DEPRECATION")
    private fun containsShortsViewId(root: AccessibilityNodeInfo): Boolean {
        for (id in SHORTS_VIEW_IDS) {
            val nodes = root.findAccessibilityNodeInfosByViewId(id)
            if (!nodes.isNullOrEmpty()) {
                nodes.forEach { it.recycle() }
                return true
            }
        }
        return false
    }

    // Detects when the "Shorts" tab in the YouTube bottom navigation is the active tab.
    // This works without any hardcoded internal view IDs.
    private fun isShortsNavSelected(root: AccessibilityNodeInfo): Boolean {
        return try {
            val nodes = root.findAccessibilityNodeInfosByText("Shorts")
            var found = false
            for (node in nodes) {
                try {
                    val text = node.text?.toString() ?: ""
                    // Exact match avoids false positives from titles like "Top Shorts"
                    if (text.equals("Shorts", ignoreCase = true) && node.isSelected) {
                        found = true
                        break
                    }
                } finally {
                    node.recycle()
                }
            }
            found
        } catch (e: Exception) {
            false
        }
    }

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

    // --- Diagnostic mode: captures all YouTube view IDs for analysis ---

    private fun runDiagnostic(root: AccessibilityNodeInfo, event: AccessibilityEvent) {
        try {
            val ids = mutableSetOf<String>()
            collectAllIds(root, ids, 0)

            val existingStr = prefs.getString(KEY_DIAG_IDS, "") ?: ""
            val existingIds = if (existingStr.isEmpty()) mutableSetOf()
                else existingStr.split("\n").filter { it.isNotEmpty() }.toMutableSet()
            existingIds.addAll(ids)
            val trimmedIds = existingIds.toSortedSet().take(400).joinToString("\n")

            val cls = event.className?.toString() ?: ""
            val existingClsStr = prefs.getString(KEY_DIAG_CLASSES, "") ?: ""
            val existingCls = if (existingClsStr.isEmpty()) mutableSetOf()
                else existingClsStr.split("\n").filter { it.isNotEmpty() }.toMutableSet()
            if (cls.isNotEmpty()) existingCls.add(cls)
            val trimmedCls = existingCls.toSortedSet().take(50).joinToString("\n")

            prefs.edit()
                .putString(KEY_DIAG_IDS, trimmedIds)
                .putString(KEY_DIAG_CLASSES, trimmedCls)
                .apply()
        } catch (e: Exception) { /* ignore */ }
    }

    private fun collectAllIds(node: AccessibilityNodeInfo, ids: MutableSet<String>, depth: Int) {
        if (depth > 8) return
        node.viewIdResourceName?.let {
            if (it.startsWith("com.google")) ids.add(it)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try { collectAllIds(child, ids, depth + 1) } finally { child.recycle() }
        }
    }

    // ---

    private fun pressBack(now: Long) {
        if (now - lastBackPressTime < BACK_PRESS_COOLDOWN_MS) return
        lastBackPressTime = now
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    private fun isBlockerEnabled(): Boolean =
        if (::prefs.isInitialized) prefs.getBoolean(KEY_ENABLED, true) else true

    override fun onInterrupt() {}
}
