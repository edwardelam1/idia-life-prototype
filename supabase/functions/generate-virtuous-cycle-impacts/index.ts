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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { user_id } = await req.json();

    // Get user's data contributions
    const { data: stagedData, error: stagedError } = await supabase
      .from('staged_health_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (stagedError) {
      console.error('Error fetching staged data:', stagedError);
      return new Response('Failed to fetch data', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const dataCount = stagedData?.length || 0;
    
    // Generate AI-powered virtuous cycle impacts
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that generates realistic, positive impact statements for health data contributions. Generate 2-3 specific research improvements that health data could realistically help with. Keep each impact statement under 50 characters and make them sound authentic and meaningful.'
          },
          {
            role: 'user',
            content: `Generate virtuous cycle impacts for a health data platform that has received ${dataCount} recent health data contributions. Focus on realistic research and health improvements.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate impacts');
    }

    const aiResponse = await response.json();
    const impactText = aiResponse.choices[0].message.content;
    
    // Parse the response into individual impacts
    const impacts = impactText.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim())
      .slice(0, 3);

    return new Response(JSON.stringify({
      success: true,
      impacts: impacts,
      data_contributions: dataCount
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating virtuous cycle impacts:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})