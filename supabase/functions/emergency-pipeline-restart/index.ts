import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Emergency Pipeline Restart: Starting processing of stuck records')

    // Get all pending records
    const { data: pendingRecords, error: fetchError } = await supabaseClient
      .from('raw_health_data')
      .select('id, created_at, processing_status')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching pending records:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${pendingRecords?.length || 0} pending records to process`)

    let processedCount = 0
    let errorCount = 0

    // Process each record by calling idia-synapse
    for (const record of pendingRecords || []) {
      try {
        console.log(`Processing record ${record.id} from ${record.created_at}`)

        const { data, error } = await supabaseClient.functions.invoke('idia-synapse', {
          body: {
            raw_data_id: record.id,
            orchestration_mode: true
          }
        })

        if (error) {
          console.error(`Error processing record ${record.id}:`, error)
          errorCount++
        } else {
          console.log(`Successfully processed record ${record.id}`)
          processedCount++
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Exception processing record ${record.id}:`, error)
        errorCount++
      }
    }

    // Also call the nightly processor to ensure everything is clean
    try {
      console.log('Running nightly data processor...')
      const { data, error } = await supabaseClient.functions.invoke('nightly-data-processor', {
        body: { manual_trigger: true }
      })

      if (error) {
        console.error('Nightly processor error:', error)
      } else {
        console.log('Nightly processor completed successfully')
      }
    } catch (error) {
      console.error('Exception running nightly processor:', error)
    }

    const result = {
      success: true,
      totalPendingRecords: pendingRecords?.length || 0,
      processedSuccessfully: processedCount,
      errors: errorCount,
      message: `Emergency restart completed. Processed ${processedCount} records with ${errorCount} errors.`
    }

    console.log('Emergency Pipeline Restart completed:', result)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Emergency Pipeline Restart failed:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})