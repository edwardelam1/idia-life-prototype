import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== SECURITY SYSTEM TEST FUNCTION ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing crazy-8-security function...');

    // Test 1: Health check
    console.log('Step 1: Testing health check endpoint...');
    const healthResponse = await fetch(`https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/crazy-8-security/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    console.log('Health check response status:', healthResponse.status);
    const healthData = await healthResponse.text();
    console.log('Health check response:', healthData);

    // Test 2: Direct security analysis
    console.log('Step 2: Testing direct security analysis...');
    const analysisResponse = await fetch(`https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/crazy-8-security`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        agent: 'crazy_sentinel',
        action: 'test_analysis',
        data: {
          test_event: 'security_system_test',
          timestamp: new Date().toISOString()
        },
        context: {
          trigger: 'manual_test',
          function: 'test-security-system'
        }
      })
    });

    console.log('Analysis response status:', analysisResponse.status);
    const analysisData = await analysisResponse.text();
    console.log('Analysis response:', analysisData);

    // Test 3: Security event generator
    console.log('Step 3: Testing security event generator...');
    const eventGenResponse = await fetch(`https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/security-event-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        event_type: 'system_health_check',
        source_data: {
          error_rate: 0.1,
          performance_degradation: true,
          response_time_increase: '200ms',
          affected_endpoints: ['/api/test']
        },
        priority: 'high'
      })
    });

    console.log('Event generator response status:', eventGenResponse.status);
    const eventGenData = await eventGenResponse.text();
    console.log('Event generator response:', eventGenData);

    return new Response(JSON.stringify({
      success: true,
      tests_completed: 3,
      health_check: {
        status: healthResponse.status,
        response: healthData
      },
      direct_analysis: {
        status: analysisResponse.status,
        response: analysisData
      },
      event_generator: {
        status: eventGenResponse.status,
        response: eventGenData
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing security system:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});