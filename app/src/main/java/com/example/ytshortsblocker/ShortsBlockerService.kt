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

        private const val CONTENT_CHANGE_COOLDOWN_MS = 200L
        private const val BACK_PRESS_COOLDOWN_MS = 1500L

        // Known Shorts view IDs — checked first (fast native search)
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

        // Class name fragments for window-state transitions
        private val SHORTS_CLASS_FRAGMENTS = listOf(
            "shorts", "Shorts",
            "reel", "Reel",
            "ReelWatchFragment",
            "ShortsActivity",
            "ShortsFragment",
            "com.google.android.apps.youtube.app.shorts",
        )
    }

    private lateinit var prefs: SharedPreferences
    private var lastContentCheckTime = 0L
    private var lastBackPressTime = 0L

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
        if (!isBlockerEnabled()) return
        if (event.packageName?.toString() != YOUTUBE_PACKAGE) return

        val now = System.currentTimeMillis()
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
            // Strategy 2: fast search using known view IDs
            if (containsShortsViewId(root)) return true
            // Strategy 3: deep tree scan for ANY "shorts"/"reel" view ID
            // (catches renamed IDs across YouTube updates)
            // Only on window state changes to avoid performance cost on frequent content events
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

    // Recursive scan: returns true if ANY node has a resource ID containing "shorts" or "reel"
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

    private fun pressBack(now: Long) {
        if (now - lastBackPressTime < BACK_PRESS_COOLDOWN_MS) return
        lastBackPressTime = now
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    private fun isBlockerEnabled(): Boolean =
        if (::prefs.isInitialized) prefs.getBoolean(KEY_ENABLED, true) else true

    override fun onInterrupt() {}
}
