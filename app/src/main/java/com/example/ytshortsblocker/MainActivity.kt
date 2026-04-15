package com.example.ytshortsblocker

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusIndicator: View
    private lateinit var statusText: TextView
    private lateinit var enableSwitch: SwitchCompat
    private lateinit var settingsButton: Button
    private lateinit var instructionText: TextView

    private lateinit var diagSwitch: SwitchCompat
    private lateinit var diagCountText: TextView
    private lateinit var diagCopyButton: Button
    private lateinit var diagClearButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusIndicator = findViewById(R.id.statusIndicator)
        statusText = findViewById(R.id.statusText)
        enableSwitch = findViewById(R.id.enableSwitch)
        settingsButton = findViewById(R.id.settingsButton)
        instructionText = findViewById(R.id.instructionText)
        diagSwitch = findViewById(R.id.diagSwitch)
        diagCountText = findViewById(R.id.diagCountText)
        diagCopyButton = findViewById(R.id.diagCopyButton)
        diagClearButton = findViewById(R.id.diagClearButton)

        val prefs = getSharedPreferences(ShortsBlockerService.PREFS_NAME, MODE_PRIVATE)

        enableSwitch.isChecked = prefs.getBoolean(ShortsBlockerService.KEY_ENABLED, true)
        enableSwitch.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ShortsBlockerService.KEY_ENABLED, isChecked).apply()
        }

        settingsButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        diagSwitch.isChecked = prefs.getBoolean(ShortsBlockerService.KEY_DIAG_MODE, false)
        diagSwitch.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ShortsBlockerService.KEY_DIAG_MODE, isChecked).apply()
        }

        diagCopyButton.setOnClickListener {
            val ids = prefs.getString(ShortsBlockerService.KEY_DIAG_IDS, "") ?: ""
            val classes = prefs.getString(ShortsBlockerService.KEY_DIAG_CLASSES, "") ?: ""
            if (ids.isEmpty() && classes.isEmpty()) {
                Toast.makeText(this, getString(R.string.diag_empty), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val content = buildString {
                if (classes.isNotEmpty()) {
                    appendLine("=== CLASSES ===")
                    appendLine(classes)
                    appendLine()
                }
                if (ids.isNotEmpty()) {
                    appendLine("=== IDs DE VUES ===")
                    append(ids)
                }
            }
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("YouTube IDs", content))
            Toast.makeText(this, getString(R.string.diag_copied), Toast.LENGTH_LONG).show()
        }

        diagClearButton.setOnClickListener {
            prefs.edit()
                .putString(ShortsBlockerService.KEY_DIAG_IDS, "")
                .putString(ShortsBlockerService.KEY_DIAG_CLASSES, "")
                .apply()
            updateDiagCount(prefs)
            Toast.makeText(this, getString(R.string.diag_cleared), Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
        updateDiagCount(getSharedPreferences(ShortsBlockerService.PREFS_NAME, MODE_PRIVATE))
    }

    private fun updateDiagCount(prefs: android.content.SharedPreferences) {
        val ids = prefs.getString(ShortsBlockerService.KEY_DIAG_IDS, "") ?: ""
        val count = if (ids.isEmpty()) 0 else ids.split("\n").count { it.isNotEmpty() }
        diagCountText.text = if (count == 0) getString(R.string.diag_count_zero)
        else getString(R.string.diag_count, count)
    }

    private fun updateStatus() {
        val active = isAccessibilityServiceEnabled()
        val color = if (active) R.color.status_active else R.color.status_inactive

        val bg = statusIndicator.background.mutate() as? GradientDrawable
        bg?.setColor(ContextCompat.getColor(this, color))

        if (active) {
            statusText.text = getString(R.string.status_active)
            statusText.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            settingsButton.text = getString(R.string.button_open_settings)
            instructionText.visibility = View.GONE
            enableSwitch.isEnabled = true
        } else {
            statusText.text = getString(R.string.status_inactive)
            statusText.setTextColor(ContextCompat.getColor(this, R.color.status_inactive))
            settingsButton.text = getString(R.string.button_enable_service)
            instructionText.visibility = View.VISIBLE
            enableSwitch.isEnabled = false
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val component = "${packageName}/${ShortsBlockerService::class.java.name}"
        val enabled = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) {
            if (splitter.next().equals(component, ignoreCase = true)) return true
        }
        return false
    }
}
