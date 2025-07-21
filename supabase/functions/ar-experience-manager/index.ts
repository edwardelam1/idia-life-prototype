import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ARExperienceRequest {
  action: 'create' | 'update' | 'get' | 'list' | 'track_interaction';
  business_id?: string;
  experience_id?: string;
  experience_data?: any;
  interaction_data?: any;
  user_id?: string;
  location_data?: any;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { action, business_id, experience_id, experience_data, interaction_data, user_id, location_data }: ARExperienceRequest = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      case 'create':
        return await createARExperience(supabase, business_id!, experience_data);
      
      case 'update':
        return await updateARExperience(supabase, experience_id!, experience_data);
      
      case 'get':
        return await getARExperience(supabase, experience_id!);
      
      case 'list':
        return await listARExperiences(supabase, business_id, location_data);
      
      case 'track_interaction':
        return await trackARInteraction(supabase, user_id!, experience_id!, interaction_data);
      
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

  } catch (error) {
    console.error("AR Experience Manager error:", error);
    return new Response(
      JSON.stringify({ error: "AR experience processing failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function createARExperience(supabase: any, businessId: string, experienceData: any) {
  const { data: experience, error: experienceError } = await supabase
    .from('ar_experiences')
    .insert({
      business_id: businessId,
      title: experienceData.title,
      description: experienceData.description,
      experience_type: experienceData.experience_type || 'menu_visualization',
      spatial_anchor_data: experienceData.spatial_anchor_data,
      interaction_triggers: experienceData.interaction_triggers || [],
      performance_metrics: {}
    })
    .select()
    .single();

  if (experienceError) {
    throw experienceError;
  }

  // Create associated content assets if provided
  if (experienceData.assets && experienceData.assets.length > 0) {
    const assets = experienceData.assets.map((asset: any) => ({
      ar_experience_id: experience.id,
      asset_type: asset.type,
      asset_url: asset.url,
      file_size_bytes: asset.file_size,
      asset_metadata: asset.metadata || {}
    }));

    const { error: assetsError } = await supabase
      .from('ar_content_assets')
      .insert(assets);

    if (assetsError) {
      console.error("Error creating assets:", assetsError);
    }
  }

  // Create placement zones if provided
  if (experienceData.placement_zones && experienceData.placement_zones.length > 0) {
    const zones = experienceData.placement_zones.map((zone: any) => ({
      business_id: businessId,
      location_id: zone.location_id,
      zone_name: zone.name,
      geospatial_bounds: zone.bounds,
      ar_experience_id: experience.id,
      placement_rules: zone.rules || {}
    }));

    const { error: zonesError } = await supabase
      .from('ar_placement_zones')
      .insert(zones);

    if (zonesError) {
      console.error("Error creating placement zones:", zonesError);
    }
  }

  return new Response(JSON.stringify({ success: true, experience }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function updateARExperience(supabase: any, experienceId: string, experienceData: any) {
  const { data: experience, error } = await supabase
    .from('ar_experiences')
    .update({
      title: experienceData.title,
      description: experienceData.description,
      experience_type: experienceData.experience_type,
      spatial_anchor_data: experienceData.spatial_anchor_data,
      interaction_triggers: experienceData.interaction_triggers,
      updated_at: new Date().toISOString()
    })
    .eq('id', experienceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ success: true, experience }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function getARExperience(supabase: any, experienceId: string) {
  const { data: experience, error } = await supabase
    .from('ar_experiences')
    .select(`
      *,
      ar_content_assets(*),
      ar_placement_zones(*)
    `)
    .eq('id', experienceId)
    .single();

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ experience }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function listARExperiences(supabase: any, businessId?: string, locationData?: any) {
  let query = supabase
    .from('ar_experiences')
    .select(`
      *,
      businesses(name),
      ar_content_assets(*),
      ar_placement_zones(*)
    `)
    .eq('is_active', true);

  if (businessId) {
    query = query.eq('business_id', businessId);
  }

  // If location data is provided, find experiences in nearby placement zones
  if (locationData && locationData.latitude && locationData.longitude) {
    // This would implement geospatial proximity queries
    // For now, return all active experiences
  }

  const { data: experiences, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ experiences }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function trackARInteraction(supabase: any, userId: string, experienceId: string, interactionData: any) {
  // Record the interaction
  const { data: interaction, error: interactionError } = await supabase
    .from('ar_user_interactions')
    .insert({
      user_id: userId,
      ar_experience_id: experienceId,
      interaction_type: interactionData.type,
      interaction_data: interactionData.data,
      session_id: interactionData.session_id,
      duration_seconds: interactionData.duration,
      location_data: interactionData.location,
      device_info: interactionData.device_info || {}
    })
    .select()
    .single();

  if (interactionError) {
    throw interactionError;
  }

  // Update experience performance metrics
  const { data: experience } = await supabase
    .from('ar_experiences')
    .select('performance_metrics')
    .eq('id', experienceId)
    .single();

  if (experience) {
    const metrics = experience.performance_metrics || {};
    const interactionType = interactionData.type;
    
    metrics[interactionType] = (metrics[interactionType] || 0) + 1;
    metrics.total_interactions = (metrics.total_interactions || 0) + 1;
    metrics.last_interaction = new Date().toISOString();

    await supabase
      .from('ar_experiences')
      .update({ performance_metrics: metrics })
      .eq('id', experienceId);
  }

  // Record urban flow event for analytics
  await supabase
    .from('urban_flow_events')
    .insert({
      event_type: 'ar_engagement',
      user_id: userId,
      event_data: {
        ar_experience_id: experienceId,
        interaction_type: interactionData.type,
        session_duration: interactionData.duration
      },
      geospatial_data: interactionData.location,
      session_id: interactionData.session_id,
      device_type: interactionData.device_info?.type || 'unknown',
      anonymized_user_id: await generatePseudonym(userId)
    });

  return new Response(JSON.stringify({ success: true, interaction }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function generatePseudonym(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'IDIA_SALT_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}