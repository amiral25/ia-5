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

        // Throttling constants
        private const val CHECK_COOLDOWN_MS = 300L
        private const val BACK_PRESS_COOLDOWN_MS = 1500L

        // Known Shorts-specific view IDs (updated for recent YouTube versions)
        private val SHORTS_VIEW_IDS = listOf(
            "$YOUTUBE_PACKAGE:id/reel_player_page_container",
            "$YOUTUBE_PACKAGE:id/shorts_container",
            "$YOUTUBE_PACKAGE:id/reel_channel_bar_container",
            "$YOUTUBE_PACKAGE:id/shorts_shelf_item",
            "$YOUTUBE_PACKAGE:id/reel_player_header_container",
            "$YOUTUBE_PACKAGE:id/reel_watch_fragment_container",
            "$YOUTUBE_PACKAGE:id/shorts_player_container",
        )

        // Class name fragments that indicate Shorts
        private val SHORTS_CLASS_FRAGMENTS = listOf(
            "shorts",
            "reel",
            "ReelWatchFragment",
            "ShortsActivity",
        )
    }

    private lateinit var prefs: SharedPreferences
    private var lastCheckTime = 0L
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
            notificationTimeout = 100
            packageNames = arrayOf(YOUTUBE_PACKAGE)
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (!isBlockerEnabled()) return
        if (event.packageName?.toString() != YOUTUBE_PACKAGE) return

        val now = System.currentTimeMillis()

        // Throttle content-change events — they fire very frequently
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (now - lastCheckTime < CHECK_COOLDOWN_MS) return
        }
        lastCheckTime = now

        if (detectShorts(event)) {
            pressBack(now)
        }
    }

    private fun detectShorts(event: AccessibilityEvent): Boolean {
        // Strategy 1: Class name check (fast, fires on navigation)
        val className = event.className?.toString() ?: ""
        if (SHORTS_CLASS_FRAGMENTS.any { className.contains(it, ignoreCase = true) }) {
            return true
        }

        // Strategy 2: View hierarchy scan using known Shorts view IDs (most reliable)
        val root = rootInActiveWindow ?: return false
        return try {
            containsShortsViewId(root)
        } catch (e: Exception) {
            false
        }
    }

    @Suppress("DEPRECATION")
    private fun containsShortsViewId(root: AccessibilityNodeInfo): Boolean {
        for (viewId in SHORTS_VIEW_IDS) {
            val nodes = root.findAccessibilityNodeInfosByViewId(viewId)
            if (!nodes.isNullOrEmpty()) {
                nodes.forEach { it.recycle() }
                return true
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
        prefs.getBoolean(KEY_ENABLED, true)

    override fun onInterrupt() {
        // Required — no action needed
    }
}
