//Path: android/app/src/main/java/com/idia/life/plugins/health/IDIAHealthPlugin.kt
//Replaces: HealthKitManager.swift, IDIAHealthPlugin.swift, IDIAHealthPlugin.m
//Purpose: Handles background telemetry ingestion to the user's private vault (NO ACA REQUIRED) and executes the 40Hz / 100% brightness hardware overrides.
package com.idia.life.plugins.health

import android.content.Intent
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.math.sin

@CapacitorPlugin(name = "IDIAHealth")
class IDIAHealthPlugin : Plugin() {

    private val TAG = "IDIAHealthPlugin"
    private var healthClient: HealthConnectClient? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    
    // Hardware State
    private var audioTrack: AudioTrack? = null
    private var originalBrightness: Float = -1.0f

    // Core set — used for the "granted?" decision so an opt-out on an
    // advanced metric does not report the whole connection as ungranted.
    private val CORE_PERMISSIONS = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
    )

    private val PERMISSIONS = CORE_PERMISSIONS + setOf(
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(HeightRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class),
        HealthPermission.getReadPermission(RespiratoryRateRecord::class),
        HealthPermission.getReadPermission(BloodPressureRecord::class),
        HealthPermission.getReadPermission(BodyTemperatureRecord::class),
    )

    override fun load() {
        super.load()
        try {
            val status = HealthConnectClient.getSdkStatus(context, "com.google.android.apps.healthdata")
            if (status == HealthConnectClient.SDK_AVAILABLE) {
                healthClient = HealthConnectClient.getOrCreate(context)
                Log.d(TAG, "Health Connect client initialized")
            } else {
                Log.w(TAG, "Health Connect SDK unavailable, status=$status")
            }
        } catch (e: Exception) { Log.e(TAG, "Failed to init: ${e.message}") }
    }

    // ─── AVAILABILITY (required by the JS bridge) ──────────────────────────
    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val result = JSObject()
        try {
            val status = HealthConnectClient.getSdkStatus(context, "com.google.android.apps.healthdata")
            val available = status == HealthConnectClient.SDK_AVAILABLE
            if (available && healthClient == null) {
                healthClient = HealthConnectClient.getOrCreate(context)
            }
            result.put("available", available)
            result.put("platform", "android")
            result.put("apiName", if (available) "health_connect" else "health_connect_unavailable")
        } catch (e: Exception) {
            Log.e(TAG, "checkAvailability failed: ${e.message}")
            result.put("available", false)
            result.put("platform", "android")
            result.put("apiName", "health_connect_error")
        }
        call.resolve(result)
    }

    // ─── FLAT READ (matches the JS HealthDataResult contract) ──────────────
    @PluginMethod
    fun getHealthData(call: PluginCall) {
        val client = healthClient ?: return call.reject("Health Connect not available on this device")

        val startTime = try { Instant.parse(call.getString("startDate")) } catch (e: Exception) { Instant.now().minus(1, ChronoUnit.DAYS) }
        val endTime = try { Instant.parse(call.getString("endDate")) } catch (e: Exception) { Instant.now() }
        val timeRange = TimeRangeFilter.between(startTime, endTime)

        scope.launch {
            try {
                val out = JSObject()
                out.put("recorded_at", Instant.now().toString())
                out.put("source", "health_connect")
                out.put("device_type", Build.MODEL ?: "android_device")
                out.put("type", "health_metrics")

                try {
                    val r = client.readRecords(ReadRecordsRequest(StepsRecord::class, timeRangeFilter = timeRange))
                    out.put("steps", r.records.sumOf { it.count })
                } catch (e: Exception) { Log.w(TAG, "steps read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = timeRange))
                    r.records.flatMap { it.samples }.maxByOrNull { it.time }?.let { out.put("heartRate", it.beatsPerMinute) }
                } catch (e: Exception) { Log.w(TAG, "hr read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, timeRangeFilter = timeRange))
                    out.put("calories", r.records.sumOf { it.energy.inKilocalories }.toInt())
                } catch (e: Exception) { Log.w(TAG, "calories read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRangeFilter = timeRange))
                    val hours = r.records.sumOf { it.endTime.toEpochMilli() - it.startTime.toEpochMilli() } / 3600000.0
                    out.put("sleepHours", Math.round(hours * 10) / 10.0)
                } catch (e: Exception) { Log.w(TAG, "sleep read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(DistanceRecord::class, timeRangeFilter = timeRange))
                    out.put("distance", r.records.sumOf { it.distance.inMeters })
                } catch (e: Exception) { Log.w(TAG, "distance read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(WeightRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let { out.put("weight", it.weight.inKilograms) }
                } catch (e: Exception) { Log.w(TAG, "weight read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(HeightRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let { out.put("height", it.height.inMeters) }
                } catch (e: Exception) { Log.w(TAG, "height read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let { out.put("hrv", it.heartRateVariabilityMillis) }
                } catch (e: Exception) { Log.w(TAG, "hrv read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let { out.put("oxygenSaturation", it.percentage.value) }
                } catch (e: Exception) { Log.w(TAG, "spo2 read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(RespiratoryRateRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let { out.put("respiratoryRate", it.rate) }
                } catch (e: Exception) { Log.w(TAG, "resp read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(BloodPressureRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let {
                        out.put("bloodPressureSystolic", it.systolic.inMillimetersOfMercury)
                        out.put("bloodPressureDiastolic", it.diastolic.inMillimetersOfMercury)
                    }
                } catch (e: Exception) { Log.w(TAG, "bp read failed: ${e.message}") }

                try {
                    val r = client.readRecords(ReadRecordsRequest(BodyTemperatureRecord::class, timeRangeFilter = timeRange))
                    r.records.maxByOrNull { it.time }?.let { out.put("bodyTemperature", it.temperature.inCelsius) }
                } catch (e: Exception) { Log.w(TAG, "temp read failed: ${e.message}") }

                Log.d(TAG, "🤖 [HC_READ] Flat telemetry resolved: ${out.keys().asSequence().toList()}")
                call.resolve(out)
            } catch (e: Exception) {
                Log.e(TAG, "🚨 [HC_READ_ERROR] ${e.message}")
                call.reject("Health Connect read failed: ${e.message}")
            }
        }
    }


    // ─── HARDWARE OVERRIDES (GAMMA & LIVENESS) ─────────────────────────────
    @PluginMethod
    fun triggerHardwareAction(call: PluginCall) {
        val action = call.getString("action") ?: return call.reject("Missing hardware action")

        activity.runOnUiThread {
            if (action == "CMD_INIT_FLASHBULB") {
                // Force 100% Brightness
                val window = activity.window
                val layoutParams = window.attributes
                originalBrightness = layoutParams.screenBrightness
                layoutParams.screenBrightness = 1.0f
                window.attributes = layoutParams

                setupAndStart40HzAudio()
                Log.d(TAG, "\uD83C\uDF4F [GAMMA_TRIGGER] 40Hz sequence initiated.")
                call.resolve(JSObject().put("status", "active"))
                
            } else if (action == "CMD_TERMINATE_FLASHBULB") {
                // Restore Brightness
                if (originalBrightness != -1.0f) {
                    val window = activity.window
                    val layoutParams = window.attributes
                    layoutParams.screenBrightness = originalBrightness
                    window.attributes = layoutParams
                }
                stopAudio()
                Log.d(TAG, "\uD83C\uDF4F [GAMMA_TRIGGER] Sequence terminated.")
                call.resolve(JSObject().put("status", "restored"))
            }
        }
    }

    private fun setupAndStart40HzAudio() {
        val sampleRate = 44100
        val frequency = 40.0
        val numSamples = sampleRate
        val generatedSnd = ByteArray(2 * numSamples)

        for (i in 0 until numSamples) {
            val dVal = sin(2.0 * Math.PI * i / (sampleRate / frequency))
            val valShort = (dVal * 32767).toInt().toShort()
            generatedSnd[2 * i] = (valShort.toInt() and 0x00ff).toByte()
            generatedSnd[2 * i + 1] = ((valShort.toInt() and 0xff00) ushr 8).toByte()
        }

        audioTrack = AudioTrack(
            AudioManager.STREAM_MUSIC, sampleRate, AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT, generatedSnd.size, AudioTrack.MODE_STATIC
        )
        audioTrack?.write(generatedSnd, 0, generatedSnd.size)
        // Loop the buffer indefinitely (loopCount = -1)
        audioTrack?.setLoopPoints(0, generatedSnd.size / 2, -1)
        audioTrack?.play()
    }

    private fun stopAudio() {
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null
    }

    // ─── PASSIVE VAULT SYNC (NON-TRANSACTIONAL, NO ACA) ────────────────────
    @PluginMethod
    fun triggerHealthDataSync(call: PluginCall) {
        val config = call.getObject("config")
        val userId = config?.getString("user_id") ?: "unknown_principal"
        val sessionId = config?.getString("sync_session_id") ?: "manual_sync"
        
        Log.d(TAG, "🍏 [SYNC_TRACE] Initiating passive vault sync for: $userId")
        val client = healthClient ?: return call.reject("Health Connect not available")

        val startTime = try { Instant.parse(call.getString("startDate")) } catch (e: Exception) { Instant.now().minus(1, ChronoUnit.DAYS) }
        val endTime = try { Instant.parse(call.getString("endDate")) } catch (e: Exception) { Instant.now() }
        val timeRange = TimeRangeFilter.between(startTime, endTime)

        scope.launch {
            try {
                val payload = JSObject()
                payload.put("user_id", userId)
                payload.put("device_type", Build.MODEL)
                payload.put("source", "android_health_connect")
                payload.put("recorded_at", Instant.now().toString())
                
                val metrics = JSObject()

                try { val r = client.readRecords(ReadRecordsRequest(StepsRecord::class, timeRangeFilter = timeRange)); metrics.put("steps", r.records.sumOf { it.count }) } catch (e: Exception) {}
                try { val r = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = timeRange)); r.records.flatMap { it.samples }.maxByOrNull { it.time }?.let { metrics.put("heartRate", it.beatsPerMinute) } } catch (e: Exception) {}
                try { val r = client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, timeRangeFilter = timeRange)); metrics.put("calories", r.records.sumOf { it.energy.inKilocalories }.toInt()) } catch (e: Exception) {}
                try { val r = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRangeFilter = timeRange)); metrics.put("sleepHours", Math.round(r.records.sumOf { it.endTime.toEpochMilli() - it.startTime.toEpochMilli() } / 3600000.0 * 10) / 10.0) } catch (e: Exception) {}
                
                payload.put("healthData", metrics)
                Log.d(TAG, "🍏 [SYNC_END] Telemetry collected. Returning to bridge.")
                
                call.resolve(payload)

                activity.runOnUiThread {
                    bridge.webView?.evaluateJavascript("if(window.onHealthDataSyncComplete){ window.onHealthDataSyncComplete({ sync_session_id: '$sessionId', status: 'vaulted' }); }", null)
                }
            } catch (e: Exception) {
                Log.e(TAG, "🚨 [SYNC_ERROR] ${e.message}")
                call.reject("Sync Failed: ${e.message}")
            }
        }
    }

    // Standard Permissions Boilerplate
    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val client = healthClient ?: return call.resolve(JSObject().put("granted", false))
        scope.launch {
            try {
                val missing = PERMISSIONS - client.permissionController.getGrantedPermissions()
                if (missing.isEmpty()) call.resolve(JSObject().put("granted", true))
                else {
                    activity.runOnUiThread {
                        val intent = Intent("androidx.health.ACTION_MANAGE_HEALTH_PERMISSIONS")
                        intent.putExtra(Intent.EXTRA_PACKAGE_NAME, context.packageName)
                        activity.startActivity(intent)
                        call.resolve(JSObject().put("granted", true))
                    }
                }
            } catch (e: Exception) { call.resolve(JSObject().put("granted", false)) }
        }
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val client = healthClient ?: return call.resolve(JSObject().put("granted", false))
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                call.resolve(JSObject().put("granted", granted.containsAll(PERMISSIONS)))
            } catch (e: Exception) { call.resolve(JSObject().put("granted", false)) }
        }
    }
}