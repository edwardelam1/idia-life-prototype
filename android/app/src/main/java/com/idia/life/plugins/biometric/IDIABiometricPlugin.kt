// Path: android/app/src/main/java/com/idia/life/plugins/biometric/IDIABiometricPlugin.kt
package com.idia.life.plugins.biometric

import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Android counterpart of the iOS Secure Enclave bridge. Prompts the device
 * biometric (fingerprint / face) before an ACA consent hash may be generated.
 */
@CapacitorPlugin(name = "IDIABiometric")
class IDIABiometricPlugin : Plugin() {

    private val TAG = "IDIABiometric"

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val manager = BiometricManager.from(context)
        val status = manager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        )
        val available = status == BiometricManager.BIOMETRIC_SUCCESS
        Log.d(TAG, "[BIOMETRIC_LOG] isAvailable -> $available (status=$status)")
        call.resolve(JSObject().put("available", available).put("status", status))
    }

    @PluginMethod
    fun authenticate(call: PluginCall) {
        Log.d(TAG, "[BIOMETRIC_LOG] BEGIN: authenticate")

        val activity = this.activity as? AppCompatActivity
        if (activity == null) {
            Log.e(TAG, "[BIOMETRIC_LOG] FAIL: host activity is not an AppCompatActivity")
            call.reject("BIOMETRIC_UNAVAILABLE")
            return
        }

        val title = call.getString("title") ?: "Confirm your identity"
        val subtitle = call.getString("subtitle") ?: "IDIA Sovereign Consent"

        activity.runOnUiThread {
            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(
                activity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        Log.d(TAG, "[BIOMETRIC_LOG] END: authenticate SUCCESS")
                        call.resolve(JSObject().put("verified", true))
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        Log.e(TAG, "[BIOMETRIC_LOG] FAIL: error $errorCode $errString")
                        call.reject("BIOMETRIC_REJECTED: $errString")
                    }

                    override fun onAuthenticationFailed() {
                        Log.w(TAG, "[BIOMETRIC_LOG] Attempt failed — prompt still open")
                    }
                }
            )

            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
                .build()

            prompt.authenticate(info)
        }
    }
}
