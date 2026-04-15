package com.example.ytshortsblocker

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusIndicator: View
    private lateinit var statusText: TextView
    private lateinit var enableSwitch: SwitchCompat
    private lateinit var settingsButton: Button
    private lateinit var instructionText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusIndicator = findViewById(R.id.statusIndicator)
        statusText = findViewById(R.id.statusText)
        enableSwitch = findViewById(R.id.enableSwitch)
        settingsButton = findViewById(R.id.settingsButton)
        instructionText = findViewById(R.id.instructionText)

        val prefs = getSharedPreferences(ShortsBlockerService.PREFS_NAME, MODE_PRIVATE)
        enableSwitch.isChecked = prefs.getBoolean(ShortsBlockerService.KEY_ENABLED, true)
        enableSwitch.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ShortsBlockerService.KEY_ENABLED, isChecked).apply()
        }

        settingsButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        // Refresh remote config on app open (background, non-blocking)
        RemoteConfig.refreshIfStale(this)
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
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
