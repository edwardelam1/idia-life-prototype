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
    console.log('Universal Data Processor: Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestBody = await req.json();
    
    console.log('Universal Data Processor: Processing request:', JSON.stringify(requestBody, null, 2));
    
    // Handle orchestration mode from trigger
    if (requestBody.orchestration_mode && requestBody.event_id) {
      console.log('ORCHESTRATION MODE: Processing event_id:', requestBody.event_id);
      
      // Fetch the device event
      const { data: eventData, error: fetchError } = await supabase
        .from('device_events')
        .select('*')
        .eq('id', requestBody.event_id)
        .single();

      if (fetchError || !eventData) {
        console.error('Failed to fetch device event:', fetchError);
        return new Response('Event data not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }

      // Process the event based on data category
      const processedData = await processEventByCategory(eventData, supabase);
      
      // Mark event as processed
      await supabase
        .from('device_events')
        .update({ 
          processing_status: 'completed',
          anonymized_at: new Date().toISOString()
        })
        .eq('id', eventData.id);

      console.log('Universal Data Processor completed successfully');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Universal data processing completed',
        event_id: eventData.id,
        processed_data: processedData
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reject invalid requests
    console.error('Universal Data Processor: Invalid request format');
    return new Response(JSON.stringify({
      error: 'Invalid request format. This endpoint only accepts orchestration calls from database triggers.',
      expected: { event_id: 'uuid', orchestration_mode: true },
      received: requestBody
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Universal Data Processor:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

async function processEventByCategory(eventData: any, supabase: any) {
  console.log(`Processing ${eventData.data_category} event: ${eventData.event_type}`);
  
  // Generate pseudonym for user
  const pseudoUserId = await generatePseudonym(eventData.user_id.toString());
  
  // Anonymize payload based on category
  let anonymizedPayload = {};
  let dataQualityScore = 0.5;
  let locationZone = null;

  switch (eventData.data_category) {
    case 'ai_interaction':
      anonymizedPayload = await processAIInteraction(eventData.json_payload);
      dataQualityScore = calculateAIDataQuality(eventData.json_payload);
      break;
      
    case 'wallet':
      anonymizedPayload = await processWalletEvent(eventData.json_payload);
      dataQualityScore = calculateWalletDataQuality(eventData.json_payload);
      break;
      
    case 'social':
      anonymizedPayload = await processSocialEvent(eventData.json_payload);
      dataQualityScore = calculateSocialDataQuality(eventData.json_payload);
      break;
      
    case 'voting':
      anonymizedPayload = await processVotingEvent(eventData.json_payload);
      dataQualityScore = calculateVotingDataQuality(eventData.json_payload);
      break;
      
    case 'shopping':
      anonymizedPayload = await processShoppingEvent(eventData.json_payload);
      dataQualityScore = calculateShoppingDataQuality(eventData.json_payload);
      break;
      
    case 'ar_experience':
      anonymizedPayload = await processAREvent(eventData.json_payload);
      dataQualityScore = calculateARDataQuality(eventData.json_payload);
      break;
      
    default:
      anonymizedPayload = await processGeneralEvent(eventData.json_payload);
      dataQualityScore = 0.3; // Lower quality for generic events
  }

  // Generate location zone if coordinates exist
  if (eventData.json_payload.location) {
    locationZone = await generateLocationZone(eventData.json_payload.location);
  }

  // Insert into staged_app_data
  const { data: stagedData, error: insertError } = await supabase
    .from('staged_app_data')
    .insert({
      pseudo_user_id: pseudoUserId,
      data_category: eventData.data_category,
      event_type: eventData.event_type,
      anonymized_payload: anonymizedPayload,
      data_quality_score: dataQualityScore,
      location_zone: locationZone,
      session_context: {
        session_id: eventData.session_id,
        timestamp: eventData.event_timestamp,
        device_info: anonymizedPayload.device_info || {}
      }
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting staged data:', insertError);
    throw insertError;
  }

  console.log('Staged data created:', stagedData.id);
  
  // Trigger bundling process for high-quality data
  if (dataQualityScore > 0.7) {
    console.log('High quality data detected, triggering bundle generation');
    await triggerBundleGeneration(eventData.data_category, supabase);
  }

  return stagedData;
}

// AI Interaction Processing
async function processAIInteraction(payload: any) {
  return {
    interaction_type: payload.interaction_type, // voice, text, mixed
    conversation_length: payload.conversation_length || 0,
    topics_discussed: anonymizeTopics(payload.topics || []),
    response_satisfaction: payload.satisfaction,
    voice_usage_duration: payload.voice_duration || 0,
    device_info: anonymizeDeviceInfo(payload.device_info),
    feature_used: payload.feature, // social, wallet, data, etc.
    error_count: payload.errors || 0
  };
}

// Wallet Event Processing
async function processWalletEvent(payload: any) {
  return {
    transaction_type: payload.transaction_type,
    amount_range: categorizeAmount(payload.amount),
    currency_type: payload.currency,
    payment_method: payload.payment_method,
    transaction_frequency: payload.frequency_score || 1,
    device_info: anonymizeDeviceInfo(payload.device_info),
    merchant_category: payload.merchant_category,
    time_of_day: getTimeCategory(payload.timestamp)
  };
}

// Social Event Processing
async function processSocialEvent(payload: any) {
  return {
    interaction_type: payload.interaction_type, // friend_request, trust_circle, endorsement
    relationship_strength: payload.relationship_strength || 'new',
    network_size_impact: payload.network_change || 0,
    engagement_level: payload.engagement_score || 0.5,
    trust_score_change: payload.trust_change || 0,
    device_info: anonymizeDeviceInfo(payload.device_info),
    feature_depth: payload.feature_depth || 'surface'
  };
}

// Voting Event Processing
async function processVotingEvent(payload: any) {
  return {
    vote_type: payload.vote_type, // proposal, governance, poll
    proposal_category: payload.category,
    participation_pattern: payload.participation_history || 'new',
    engagement_time: payload.engagement_seconds || 0,
    research_behavior: payload.research_actions || [],
    voting_frequency: payload.frequency_score || 1,
    device_info: anonymizeDeviceInfo(payload.device_info)
  };
}

// Shopping Event Processing
async function processShoppingEvent(payload: any) {
  return {
    browse_type: payload.browse_type, // ar_enabled, traditional, mixed
    session_duration: payload.session_duration || 0,
    ar_engagement: payload.ar_interactions || 0,
    purchase_intent: payload.intent_score || 0.5,
    product_categories: payload.categories || [],
    price_sensitivity: categorizeAmount(payload.max_price_viewed),
    device_info: anonymizeDeviceInfo(payload.device_info)
  };
}

// AR Experience Processing
async function processAREvent(payload: any) {
  return {
    experience_type: payload.experience_type,
    interaction_duration: payload.duration || 0,
    engagement_quality: payload.engagement_score || 0.5,
    conversion_action: payload.conversion || false,
    device_capabilities: anonymizeDeviceInfo(payload.device_info).ar_capable,
    experience_completion: payload.completion_rate || 0,
    sharing_behavior: payload.shared || false
  };
}

// General Event Processing
async function processGeneralEvent(payload: any) {
  return {
    feature_used: payload.feature,
    session_duration: payload.duration || 0,
    user_actions: payload.actions || [],
    navigation_pattern: payload.navigation || [],
    device_info: anonymizeDeviceInfo(payload.device_info)
  };
}

// Helper Functions
async function generatePseudonym(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'IDIA_SALT_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateLocationZone(location: any): Promise<string> {
  if (!location.lat || !location.lng) return 'ZONE_UNKNOWN';
  
  const roundedLat = Math.round(location.lat * 10) / 10;
  const roundedLng = Math.round(location.lng * 10) / 10;
  const encoder = new TextEncoder();
  const data = encoder.encode(`${roundedLat}_${roundedLng}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'ZONE_' + hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function anonymizeTopics(topics: string[]): string[] {
  const topicCategories = ['health', 'finance', 'lifestyle', 'work', 'relationships', 'technology', 'general'];
  return topics.map(topic => {
    // Simple topic categorization
    for (const category of topicCategories) {
      if (topic.toLowerCase().includes(category)) return category;
    }
    return 'general';
  });
}

function anonymizeDeviceInfo(deviceInfo: any): any {
  if (!deviceInfo) return { device_type: 'unknown' };
  
  return {
    device_type: deviceInfo.platform || 'unknown',
    screen_size: categorizeScreenSize(deviceInfo.screen_width),
    ar_capable: deviceInfo.ar_supported || false,
    performance_tier: categorizePerformance(deviceInfo.memory_gb)
  };
}

function categorizeAmount(amount: number): string {
  if (!amount || amount === 0) return 'none';
  if (amount < 10) return 'micro';
  if (amount < 100) return 'small';
  if (amount < 1000) return 'medium';
  if (amount < 10000) return 'large';
  return 'enterprise';
}

function categorizeScreenSize(width: number): string {
  if (!width) return 'unknown';
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function categorizePerformance(memory: number): string {
  if (!memory) return 'unknown';
  if (memory < 4) return 'low';
  if (memory < 8) return 'medium';
  return 'high';
}

function getTimeCategory(timestamp: string): string {
  const hour = new Date(timestamp).getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// Data Quality Calculation Functions
function calculateAIDataQuality(payload: any): number {
  let score = 0.3; // Base score
  if (payload.conversation_length > 5) score += 0.2;
  if (payload.topics && payload.topics.length > 0) score += 0.2;
  if (payload.satisfaction !== undefined) score += 0.2;
  if (payload.voice_duration > 0) score += 0.1;
  return Math.min(score, 1.0);
}

function calculateWalletDataQuality(payload: any): number {
  let score = 0.4; // Base score
  if (payload.amount !== undefined) score += 0.2;
  if (payload.merchant_category) score += 0.2;
  if (payload.payment_method) score += 0.1;
  if (payload.frequency_score > 1) score += 0.1;
  return Math.min(score, 1.0);
}

function calculateSocialDataQuality(payload: any): number {
  let score = 0.3; // Base score
  if (payload.relationship_strength) score += 0.2;
  if (payload.engagement_score > 0.5) score += 0.2;
  if (payload.network_change !== 0) score += 0.2;
  if (payload.trust_change !== 0) score += 0.1;
  return Math.min(score, 1.0);
}

function calculateVotingDataQuality(payload: any): number {
  let score = 0.4; // Base score
  if (payload.engagement_seconds > 30) score += 0.2;
  if (payload.research_actions && payload.research_actions.length > 0) score += 0.2;
  if (payload.category) score += 0.1;
  if (payload.frequency_score > 1) score += 0.1;
  return Math.min(score, 1.0);
}

function calculateShoppingDataQuality(payload: any): number {
  let score = 0.3; // Base score
  if (payload.session_duration > 60) score += 0.2;
  if (payload.ar_interactions > 0) score += 0.2;
  if (payload.categories && payload.categories.length > 0) score += 0.2;
  if (payload.intent_score > 0.7) score += 0.1;
  return Math.min(score, 1.0);
}

function calculateARDataQuality(payload: any): number {
  let score = 0.4; // Base score
  if (payload.duration > 30) score += 0.2;
  if (payload.engagement_score > 0.7) score += 0.2;
  if (payload.conversion) score += 0.2;
  return Math.min(score, 1.0);
}

async function triggerBundleGeneration(dataCategory: string, supabase: any) {
  try {
    await supabase.functions.invoke('universal-data-bundler', {
      body: {
        trigger_category: dataCategory,
        force_generation: false
      }
    });
  } catch (error) {
    console.error('Failed to trigger bundle generation:', error);
  }
}