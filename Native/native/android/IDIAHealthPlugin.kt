package com.idia.life.plugins.health

import android.content.Intent
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

@CapacitorPlugin(name = "IDIAHealth")
class IDIAHealthPlugin : Plugin() {

    private val TAG = "IDIAHealth"
    private var healthClient: HealthConnectClient? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    private val PERMISSIONS = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(HeightRecord::class),
    )

    override fun load() {
        super.load()
        try {
            val status = HealthConnectClient.getSdkStatus(context, "com.google.android.apps.healthdata")
            if (status == HealthConnectClient.SDK_AVAILABLE) {
                healthClient = HealthConnectClient.getOrCreate(context)
                Log.d(TAG, "Health Connect client initialized")
            } else { Log.w(TAG, "Health Connect not available, status: $status") }
        } catch (e: Exception) { Log.e(TAG, "Failed to init: ${e.message}") }
    }

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val result = JSObject()
        try {
            val status = HealthConnectClient.getSdkStatus(context, "com.google.android.apps.healthdata")
            result.put("available", status == HealthConnectClient.SDK_AVAILABLE)
        } catch (e: Exception) { result.put("available", false) }
        result.put("platform", "android"); result.put("apiName", "health_connect")
        call.resolve(result)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        Log.d(TAG, "[requestPermissions] START - intent fallback chain")
        val client = healthClient
        if (client == null) { call.resolve(JSObject().put("granted", false)); return }
        scope.launch {
            try {
                val granted: Set<String> = client.permissionController.getGrantedPermissions()
                val missing = PERMISSIONS - granted
                if (missing.isEmpty()) {
                    Log.d(TAG, "[requestPermissions] All permissions already granted.")
                    call.resolve(JSObject().put("granted", true))
                    return@launch
                }
                activity.runOnUiThread {
                    try {
                        val pm = context.packageManager
                        val modern = Intent("androidx.health.ACTION_MANAGE_HEALTH_PERMISSIONS").apply {
                            putExtra(Intent.EXTRA_PACKAGE_NAME, context.packageName)
                        }
                        when {
                            modern.resolveActivity(pm) != null -> {
                                Log.d(TAG, "[requestPermissions] Launching modern ACTION_MANAGE_HEALTH_PERMISSIONS.")
                                activity.startActivity(modern)
                            }
                            else -> {
                                val legacy = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                                if (legacy.resolveActivity(pm) != null) {
                                    Log.d(TAG, "[requestPermissions] Launching legacy ACTION_HEALTH_CONNECT_SETTINGS.")
                                    activity.startActivity(legacy)
                                } else {
                                    Log.d(TAG, "[requestPermissions] Falling back to Play Store.")
                                    activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata")))
                                }
                            }
                        }
                        // Do not lie. Resolve false; JS layer will poll checkPermissions on resume.
                        call.resolve(JSObject().put("granted", false))
                        Log.d(TAG, "[requestPermissions] END - resolved granted:false (poll on resume)")
                    } catch (e: Exception) {
                        Log.e(TAG, "[requestPermissions] Intent chain failed", e)
                        call.resolve(JSObject().put("granted", false))
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "[requestPermissions] Top-level failure", e)
                call.resolve(JSObject().put("granted", false))
            }
        }
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val client = healthClient
        if (client == null) { call.resolve(JSObject().put("granted", false)); return }
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                call.resolve(JSObject().put("granted", granted.containsAll(PERMISSIONS)))
            } catch (e: Exception) { call.resolve(JSObject().put("granted", false)) }
        }
    }

    @PluginMethod
    fun getHealthData(call: PluginCall) {
        val client = healthClient
        if (client == null) { call.reject("Health Connect not available"); return }
        val startTime = try { Instant.parse(call.getString("startDate")) } catch (e: Exception) { Instant.now().minus(1, ChronoUnit.DAYS) }
        val endTime = try { Instant.parse(call.getString("endDate")) } catch (e: Exception) { Instant.now() }
        val timeRange = TimeRangeFilter.between(startTime, endTime)

        scope.launch {
            try { val g = client.permissionController.getGrantedPermissions(); if (g.isEmpty()) { call.reject("No permissions granted"); return@launch } } catch (e: Exception) {}

            val result = JSObject()
            result.put("recorded_at", Instant.now().toString()); result.put("source", "health_connect")
            result.put("device_type", Build.MODEL); result.put("type", "health_metrics")

            try { val r = client.readRecords(ReadRecordsRequest(StepsRecord::class, timeRangeFilter = timeRange)); result.put("steps", r.records.sumOf { it.count }) } catch (e: Exception) {}
            try { val r = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = timeRange)); r.records.flatMap { it.samples }.maxByOrNull { it.time }?.let { result.put("heartRate", it.beatsPerMinute) } } catch (e: Exception) {}
            try { val r = client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, timeRangeFilter = timeRange)); result.put("calories", r.records.sumOf { it.energy.inKilocalories }.toInt()) } catch (e: Exception) {}
            try { val r = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRangeFilter = timeRange)); result.put("sleepHours", Math.round(r.records.sumOf { it.endTime.toEpochMilli() - it.startTime.toEpochMilli() } / 3600000.0 * 10) / 10.0) } catch (e: Exception) {}
            try { val r = client.readRecords(ReadRecordsRequest(DistanceRecord::class, timeRangeFilter = timeRange)); result.put("distance", r.records.sumOf { it.distance.inMeters }) } catch (e: Exception) {}
            try { val r = client.readRecords(ReadRecordsRequest(WeightRecord::class, timeRangeFilter = timeRange)); r.records.maxByOrNull { it.time }?.let { result.put("weight", it.weight.inKilograms) } } catch (e: Exception) {}
            try { val r = client.readRecords(ReadRecordsRequest(HeightRecord::class, timeRangeFilter = timeRange)); r.records.maxByOrNull { it.time }?.let { result.put("height", it.height.inMeters * 100) } } catch (e: Exception) {}

            call.resolve(result)
        }
    }
}
