import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    console.log('🔄 Starting daily Apple Health sync process...')

    // Get all active Apple Health connections that haven't synced in the last 20 hours
    const twentyHoursAgo = new Date()
    twentyHoursAgo.setHours(twentyHoursAgo.getHours() - 20)

    const { data: activeConnections, error: connectionsError } = await supabase
      .from('data_connections')
      .select('*')
      .eq('connection_type', 'apple_health')
      .eq('is_active', true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${twentyHoursAgo.toISOString()}`)

    if (connectionsError) {
      console.error('❌ Error fetching connections:', connectionsError)
      throw connectionsError
    }

    console.log(`📱 Found ${activeConnections?.length || 0} Apple Health connections needing sync`)

    if (!activeConnections || activeConnections.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No Apple Health connections need syncing',
        connections_checked: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const syncResults = []

    // Process each connection
    for (const connection of activeConnections) {
      try {
        console.log(`🔄 Processing Apple Health sync for user: ${connection.user_id}`)

        // Call the apple-health-sync function with automated_sync flag
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
          'apple-health-sync',
          {
            body: {
              user_id: connection.user_id,
              automated_sync: true,
              sync_date: new Date().toISOString().split('T')[0], // Today's date
              force_real_data_only: true
            }
          }
        )

        if (syncError) {
          console.error(`❌ Sync failed for user ${connection.user_id}:`, syncError)
          syncResults.push({
            user_id: connection.user_id,
            status: 'failed',
            error: syncError.message
          })
          
          // Update connection status to indicate sync failure
          await supabase
            .from('data_connections')
            .update({
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id)
        } else {
          console.log(`✅ Sync successful for user ${connection.user_id}`)
          syncResults.push({
            user_id: connection.user_id,
            status: 'success',
            data: syncResult
          })

          // Update last_sync_at timestamp
          await supabase
            .from('data_connections')
            .update({
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id)
        }
      } catch (error) {
        console.error(`❌ Error processing user ${connection.user_id}:`, error)
        syncResults.push({
          user_id: connection.user_id,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = syncResults.filter(r => r.status === 'success').length
    const failureCount = syncResults.filter(r => r.status !== 'success').length

    console.log(`📊 Daily sync complete: ${successCount} successful, ${failureCount} failed`)

    // Log sync summary for monitoring
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'daily_apple_health',
        total_connections: activeConnections.length,
        successful_syncs: successCount,
        failed_syncs: failureCount,
        sync_results: syncResults,
        created_at: new Date().toISOString()
      })
      .select()

    return new Response(JSON.stringify({
      message: 'Daily Apple Health sync completed',
      total_connections: activeConnections.length,
      successful_syncs: successCount,
      failed_syncs: failureCount,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Daily Apple Health sync failed:', error)
    return new Response(JSON.stringify({ 
      error: 'Daily sync failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})