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
    }

    private lateinit var prefs: SharedPreferences
    private var lastContentCheckTime = 0L
    private var lastBackPressTime = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        // Kick off background config refresh (no-op if still fresh)
        RemoteConfig.refreshIfStale(this)

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
        if (!isBlockerEnabled()) return

        val now = System.currentTimeMillis()
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (now - lastContentCheckTime < CONTENT_CHANGE_COOLDOWN_MS) return
            lastContentCheckTime = now
        }

        if (detectShorts(event)) pressBack(now)
    }

    private fun detectShorts(event: AccessibilityEvent): Boolean {
        val config = RemoteConfig.get(this)

        // Strategy 1: class name on window transitions
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val cls = event.className?.toString() ?: ""
            if (config.classFragments.any { cls.contains(it, ignoreCase = true) }) return true
        }

        val root = rootInActiveWindow ?: return false

        return try {
            // Strategy 2: fast lookup of known view IDs (updated remotely)
            if (containsShortsViewId(root, config.viewIds)) return true
            // Strategy 3: Shorts nav tab is the active bottom-bar tab (no IDs needed)
            if (isShortsNavSelected(root)) return true
            // Strategy 4: deep tree scan — any view ID containing "shorts"/"reel"
            // Only on state changes to avoid perf cost on frequent content events
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                scanTreeForShortsId(root, 0)
            } else false
        } catch (e: Exception) {
            false
        }
    }

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
     * Returns true when the "Shorts" tab in YouTube's bottom navigation bar is
     * the selected/active item. Works without any hardcoded internal view IDs.
     */
    private fun isShortsNavSelected(root: AccessibilityNodeInfo): Boolean {
        return try {
            val nodes = root.findAccessibilityNodeInfosByText("Shorts")
            var found = false
            for (node in nodes) {
                try {
                    // Exact match avoids false positives from titles like "Top Shorts"
                    if (node.text?.toString().equals("Shorts", ignoreCase = true) &&
                        node.isSelected
                    ) {
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

    /** Recursive fallback: finds any view whose resource ID contains "shorts" or "reel". */
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
