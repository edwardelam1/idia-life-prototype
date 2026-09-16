
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StravaWebhookPayload {
  aspect_type: string;
  event_time: number;
  object_id: number;
  object_type: string;
  owner_id: number;
  subscription_id: number;
  updates?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'GET') {
      // Handle Strava webhook verification
      const url = new URL(req.url);
      const hubMode = url.searchParams.get('hub.mode');
      const hubChallenge = url.searchParams.get('hub.challenge');
      const hubVerifyToken = url.searchParams.get('hub.verify_token');
      
      if (hubMode === 'subscribe' && hubVerifyToken === 'STRAVA_VERIFY_TOKEN') {
        return new Response(hubChallenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        });
      }
      
      return new Response('Invalid verification request', { status: 400, headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const requestBody = await req.json();
      
      // Check if this is an automated sync request
      if (requestBody.automated_sync) {
        console.log('Live-only policy active: skipping simulated Strava data generation. Rely on Strava webhooks for live events.');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Live-only policy enforced. Automated sync will not generate simulated Strava data. Live data flows via Strava webhooks and valid access tokens.',
            policy: 'no-simulated-data'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // ── Scheduled pull: live Strava REST read for one user ───────────
      // Never fabricates data. An empty activity list is recorded as an empty sync.
      if (requestBody.pull === true) {
        const started = Date.now();
        const userId = requestBody.user_id;
        console.info(`[BEGIN: strava-pull] user=${userId ?? "none"}`);

        if (!userId) {
          console.error('[ERROR: strava-pull] user_id is required. Silent stall prevented.');
          return new Response(JSON.stringify({ error: 'user_id is required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: rows, error: connErr } = await supabase
          .from('data_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('connection_type', 'strava')
          .eq('is_active', true)
          .limit(1);

        const connection = rows?.[0];
        if (connErr || !connection) {
          console.error(`[ERROR: strava-pull] no active connection (${connErr?.message ?? 'none found'})`);
          return new Response(JSON.stringify({ error: 'no_active_connection' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // ── Token refresh (Strava access tokens expire every 6 hours) ──
        let accessToken = connection.access_token as string | null;
        const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
        if (!accessToken || expiresAt - Date.now() < 5 * 60 * 1000) {
          console.info('[BEGIN: strava-pull.RefreshToken]');
          const clientId = Deno.env.get('STRAVA_CLIENT_ID');
          const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
          if (!clientId || !clientSecret || !connection.refresh_token) {
            console.error('[ERROR-HALT: strava-pull.RefreshToken] missing credentials or refresh token.');
            await supabase.from('data_connections').update({
              sync_status: 'error',
              sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
            }).eq('id', connection.id);
            return new Response(JSON.stringify({ error: 'missing_refresh_credentials' }), {
              status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const refreshRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
              refresh_token: connection.refresh_token,
            }).toString(),
          });

          if (!refreshRes.ok) {
            const detail = await refreshRes.text().catch(() => '');
            console.error(`[ERROR-API: strava-pull.RefreshToken] status=${refreshRes.status} body=${detail}`);
            await supabase.from('data_connections').update({
              sync_status: 'error',
              sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
            }).eq('id', connection.id);
            return new Response(JSON.stringify({ error: 'token_refresh_failed', status: refreshRes.status }), {
              status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const tok = await refreshRes.json();
          accessToken = tok.access_token;
          await supabase.from('data_connections').update({
            access_token: tok.access_token,
            refresh_token: tok.refresh_token ?? connection.refresh_token,
            token_expires_at: new Date((tok.expires_at ?? Math.floor(Date.now() / 1000) + 21600) * 1000).toISOString(),
          }).eq('id', connection.id);
          console.info('[END: strava-pull.RefreshToken] token renewed');
        }

        // ── Activities recorded since the last successful sync ─────────
        const sinceMs = connection.last_successful_sync
          ? new Date(connection.last_successful_sync).getTime()
          : Date.now() - 7 * 24 * 60 * 60 * 1000;
        const after = Math.floor(sinceMs / 1000);
        console.info(`[BEGIN: strava-pull.FetchActivities] after=${after}`);

        const listRes = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!listRes.ok) {
          const detail = await listRes.text().catch(() => '');
          console.error(`[ERROR-API: strava-pull.FetchActivities] status=${listRes.status} body=${detail}`);
          await supabase.from('data_connections').update({
            sync_status: 'error',
            sync_failure_count: (connection.sync_failure_count ?? 0) + 1,
          }).eq('id', connection.id);
          return new Response(JSON.stringify({ error: 'strava_fetch_failed', status: listRes.status }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const activities = await listRes.json();
        const list = Array.isArray(activities) ? activities : [];
        console.info(`[END: strava-pull.FetchActivities] activities=${list.length}`);

        let ingested = 0;
        for (const activity of list) {
          const activityId = activity?.id;
          if (!activityId) continue;

          const { data: existing } = await supabase
            .from('raw_strava_data')
            .select('id')
            .eq('user_id', connection.user_id)
            .eq('activity_id', activityId)
            .limit(1);

          if (existing && existing.length > 0) {
            console.info(`[INFO: strava-pull.Ingest] activity=${activityId} already stored, skipping`);
            continue;
          }

          const { error: insErr } = await supabase.from('raw_strava_data').insert({
            user_id: connection.user_id,
            connection_id: connection.id,
            activity_id: activityId,
            raw_data: activity,
          });

          if (insErr) {
            console.error(`[ERROR: strava-pull.Ingest] activity=${activityId} ${insErr.message}`);
            continue;
          }

          const anon = await supabase.functions.invoke('anonymize-and-stage-data', {
            body: { raw_data_id: null, activity_id: activityId },
          });
          if (anon.error) {
            console.error(`[ERROR: strava-pull.Stage] activity=${activityId} ${anon.error.message}`);
          }
          ingested += 1;
        }

        const nowIso = new Date().toISOString();
        await supabase.from('data_connections').update({
          sync_status: 'ok',
          last_sync_at: nowIso,
          last_successful_sync: nowIso,
          sync_failure_count: 0,
        }).eq('id', connection.id);

        console.info(`[END: strava-pull] activities=${list.length} ingested=${ingested} ms=${Date.now() - started}`);
        return new Response(
          JSON.stringify({ success: true, activities: list.length, ingested }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }


      
      const payload: StravaWebhookPayload = requestBody;
      
      console.log('Received Strava webhook:', payload);

      // Only process activity creation and updates
      if (payload.object_type !== 'activity' || 
          !['create', 'update'].includes(payload.aspect_type)) {
        return new Response('Event not processed', { 
          status: 200, 
          headers: corsHeaders 
        });
      }

      // Find the user's connection based on Strava athlete ID
      // First get the athlete ID from the webhook payload
      const athleteId = payload.owner_id;
      
      // We need to find the connection by matching the athlete_id with stored token data
      // For now, we'll get the first active Strava connection and validate the athlete_id
      const { data: connections, error: connectionError } = await supabase
        .from('data_connections')
        .select('*')
        .eq('connection_type', 'strava')
        .eq('is_active', true);

      if (connectionError || !connections || connections.length === 0) {
        console.error('No active Strava connections found:', connectionError);
        return new Response('No connection found', { 
          status: 200, 
          headers: corsHeaders 
        });
      }

      // For now, use the first connection - in production, you'd match by athlete_id
      const connection = connections[0];

      if (connectionError || !connection) {
        console.error('No active Strava connection found:', connectionError);
        return new Response('No connection found', { 
          status: 200, 
          headers: corsHeaders 
        });
      }

      // Fetch detailed activity data from Strava API
      const stravaResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${payload.object_id}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`
          }
        }
      );

      if (!stravaResponse.ok) {
        console.error('Failed to fetch activity from Strava:', stravaResponse.statusText);
        return new Response('Failed to fetch activity', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      const activityData = await stravaResponse.json();

      // Store raw data in database
      const { error: insertError } = await supabase
        .from('raw_strava_data')
        .insert({
          user_id: connection.user_id,
          connection_id: connection.id,
          activity_id: payload.object_id,
          raw_data: activityData
        });

      if (insertError) {
        console.error('Failed to insert raw data:', insertError);
        return new Response('Database error', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      // Trigger the anonymization function
      const anonymizeResponse = await supabase.functions.invoke('anonymize-and-stage-data', {
        body: {
          raw_data_id: null, // Will be found by activity_id
          activity_id: payload.object_id
        }
      });

      if (anonymizeResponse.error) {
        console.error('Failed to trigger anonymization:', anonymizeResponse.error);
      }

      return new Response('Webhook processed successfully', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})
