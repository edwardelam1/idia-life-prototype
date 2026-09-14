import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FORD_API_BASE = 'https://api.vehicle.ford.com/fcon-query/v1';
const FORD_TOKEN_URL = 'https://api.vehicle.ford.com/dah2vb2cprod.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_FCON_AUTHORIZE';

async function refreshFordToken(supabase: any, connection: any) {
  const clientId = Deno.env.get('FORD_CLIENT_ID');
  const clientSecret = Deno.env.get('FORD_CLIENT_SECRET');

  if (!clientId || !clientSecret || !connection.refresh_token) return null;

  const tokenResponse = await fetch(FORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
    }).toString()
  });

  if (!tokenResponse.ok) return null;

  const tokenData = await tokenResponse.json();

  await supabase
    .from('data_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || connection.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
    })
    .eq('id', connection.id);

  return tokenData.access_token;
}

async function fordApiCall(accessToken: string, endpoint: string) {
  const response = await fetch(`${FORD_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ford API error [${response.status}]: ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Ford connection
    const { data: connectionRows, error: connError } = await supabase
      .from('data_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('connection_type', 'ford')
      .limit(1);

    const connection = connectionRows?.[0];

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active Ford connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      const refreshedToken = await refreshFordToken(supabase, connection);
      if (!refreshedToken) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Ford token. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      accessToken = refreshedToken;
    }

    // Fetch vehicles list
    const garageData = await fordApiCall(accessToken, '/garage');
    const vehicles = Array.isArray(garageData) ? garageData : garageData?.vehicles ? garageData.vehicles : garageData?.vin ? [garageData] : [];

    if (vehicles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No vehicles found on this account', vehicles: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allVehicleData = [];

    for (const vehicle of vehicles) {
      const vehicleId = vehicle.vin || vehicle.vehicleId;
      const telemetry = await fordApiCall(accessToken, '/telemetry');

      const vehicleTelemetry: Record<string, any> = {
        vehicleId,
        make: vehicle.make,
        modelName: vehicle.modelName,
        modelYear: vehicle.modelYear,
        vin: vehicle.vin,
        color: vehicle.color,
        nickName: vehicle.nickName,
      };

      vehicleTelemetry.telemetry = telemetry;

      // Store raw telemetry in raw_health_data for pipeline processing
      const { error: insertError } = await supabase
        .from('raw_health_data')
        .insert({
          user_id,
          device_type: 'ford_vehicle',
          activity_type: 'vehicle_telemetry',
          raw_payload: vehicleTelemetry,
          processing_status: 'pending',
          recorded_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error storing Ford vehicle data:', insertError);
      }

      allVehicleData.push(vehicleTelemetry);
    }

    // Update last sync time
    await supabase
      .from('data_connections')
       .update({ is_active: true, last_sync_at: new Date().toISOString(), last_successful_sync: new Date().toISOString(), sync_status: 'healthy' })
      .eq('id', connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${allVehicleData.length} vehicle(s)`,
        vehicles: allVehicleData,
        sync_timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ford Vehicle Data Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
