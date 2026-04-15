package com.example.ytshortsblocker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Fetches and caches the Shorts detection config from GitHub.
 * When YouTube changes internal IDs, only the remote JSON needs updating —
 * no new APK release required. Refreshes every 24 h in background.
 */
object RemoteConfig {

    private const val CONFIG_URL =
        "https://raw.githubusercontent.com/amiral25/ia-5/main/shorts_ids.json"
    private const val PREFS_NAME = "remote_config"
    private const val KEY_JSON = "config_json"
    private const val KEY_LAST_FETCH = "last_fetch"
    private const val REFRESH_MS = 24 * 60 * 60 * 1_000L // 24 h
    private const val TIMEOUT_MS = 6_000

    @Volatile private var memCache: ShortsConfig? = null

    /** Returns the best available config (memory → disk → bundled asset). */
    fun get(context: Context): ShortsConfig =
        memCache ?: load(context).also { memCache = it }

    /** Triggers a background refresh if 24 h have elapsed. No-op otherwise. */
    fun refreshIfStale(context: Context) {
        val prefs = prefs(context)
        if (System.currentTimeMillis() - prefs.getLong(KEY_LAST_FETCH, 0) < REFRESH_MS) return
        Thread {
            fetch(prefs)
            memCache = null // invalidate so next get() picks up new data
        }.also { it.isDaemon = true }.start()
    }

    private fun load(context: Context): ShortsConfig {
        val saved = prefs(context).getString(KEY_JSON, null)
        if (saved != null) {
            try { return parse(saved) } catch (e: Exception) { /* corrupt cache */ }
        }
        return try {
            val bundled = context.assets.open("shorts_ids.json").bufferedReader().readText()
            parse(bundled)
        } catch (e: Exception) {
            ShortsConfig.FALLBACK
        }
    }

    private fun fetch(prefs: SharedPreferences) {
        try {
            val conn = URL(CONFIG_URL).openConnection() as HttpURLConnection
            conn.connectTimeout = TIMEOUT_MS
            conn.readTimeout = TIMEOUT_MS
            conn.setRequestProperty("Cache-Control", "no-cache")
            val json = conn.inputStream.bufferedReader().readText()
            parse(json) // validate before saving
            prefs.edit()
                .putString(KEY_JSON, json)
                .putLong(KEY_LAST_FETCH, System.currentTimeMillis())
                .apply()
        } catch (e: Exception) { /* no internet or server error — keep existing */ }
    }

    private fun parse(json: String): ShortsConfig {
        val obj = JSONObject(json)
        val ids = obj.getJSONArray("view_ids")
        val cls = obj.getJSONArray("class_fragments")
        return ShortsConfig(
            viewIds = (0 until ids.length()).map { ids.getString(it) },
            classFragments = (0 until cls.length()).map { cls.getString(it) }
        )
    }

    private fun prefs(ctx: Context) =
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}

data class ShortsConfig(
    val viewIds: List<String>,
    val classFragments: List<String>
) {
    companion object {
        val FALLBACK = ShortsConfig(
            viewIds = listOf(
                "com.google.android.youtube:id/reel_player_page_container",
                "com.google.android.youtube:id/shorts_container",
                "com.google.android.youtube:id/reel_channel_bar_container",
                "com.google.android.youtube:id/reel_watch_fragment_container",
                "com.google.android.youtube:id/shorts_player_container",
                "com.google.android.youtube:id/reel_player_id",
                "com.google.android.youtube:id/reel_overlay_container",
                "com.google.android.youtube:id/shorts_pivot_item",
            ),
            classFragments = listOf(
                "shorts", "Shorts", "reel", "Reel",
                "ReelWatchFragment", "ShortsActivity", "ShortsFragment",
            )
        )
    }
}
