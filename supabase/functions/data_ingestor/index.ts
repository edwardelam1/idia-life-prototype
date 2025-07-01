
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Ensure the request method is POST.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. Create a Supabase admin client to bypass RLS for server-side operations.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Extract the authorization header to identify the user.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing Authorization Header' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
    const token = authHeader.replace('Bearer ', '');

    // 4. Get the user object from the JWT.
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
        console.error('User authentication error:', userError);
        return new Response(JSON.stringify({ error: 'Invalid Token' }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    // 5. Parse the incoming JSON body from the request.
    const eventData = await req.json();
    console.log('Received event data:', eventData);
    
    if (!eventData.event_type || !eventData.payload) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request body: must contain event_type and payload' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    // 6. Construct the record for the database insert.
    const recordToInsert = {
        user_id: user.id,
        event_type: eventData.event_type,
        json_payload: eventData.payload,
        event_timestamp: eventData.timestamp ? new Date(eventData.timestamp).toISOString() : new Date().toISOString()
    };

    console.log('Inserting record:', recordToInsert);

    // 7. Insert the record into the 'device_events' table.
    const { data, error } = await supabaseAdmin
      .from('device_events')
      .insert(recordToInsert)
      .select();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    console.log('Successfully inserted event:', data);

    // 8. Return a success response.
    return new Response(JSON.stringify({ success: true, data: data }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in data_ingestor function:', err);
    // 9. Return an error response if any step fails.
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
