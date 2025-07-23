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
    console.log('Universal Data Bundler: Starting bundle generation');
    
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
    
    console.log('Bundle generation request:', JSON.stringify(requestBody, null, 2));
    
    // Get recent staged data for bundling
    const bundleThreshold = requestBody.force_generation ? 1 : 100; // Minimum records for bundle
    const timeWindow = requestBody.time_window || '24 hours';
    
    // Generate bundles by category
    const bundleResults = await Promise.all([
      generateBehavioralBundle(supabase, bundleThreshold, timeWindow),
      generateSocialBundle(supabase, bundleThreshold, timeWindow),
      generateFinancialBundle(supabase, bundleThreshold, timeWindow),
      generateAIPatternBundle(supabase, bundleThreshold, timeWindow),
      generateCivicBundle(supabase, bundleThreshold, timeWindow),
      generateCommerceBundle(supabase, bundleThreshold, timeWindow)
    ]);
    
    const successfulBundles = bundleResults.filter(result => result.success);
    
    console.log(`Bundle generation completed: ${successfulBundles.length} bundles created`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Universal data bundling completed',
      bundles_created: successfulBundles.length,
      bundles: successfulBundles
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Universal Data Bundler:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})

async function generateBehavioralBundle(supabase: any, threshold: number, timeWindow: string) {
  try {
    console.log('Generating behavioral intelligence bundle');
    
    // Get general app usage data
    const { data: behavioralData, error } = await supabase
      .from('staged_app_data')
      .select('*')
      .in('data_category', ['general', 'ai_interaction'])
      .gte('processed_at', `now() - interval '${timeWindow}'`)
      .limit(1000);

    if (error || !behavioralData || behavioralData.length < threshold) {
      console.log('Insufficient behavioral data for bundling');
      return { success: false, category: 'behavioral' };
    }

    const bundleMetadata = {
      data_points: behavioralData.length,
      unique_sessions: new Set(behavioralData.map(d => d.session_context?.session_id)).size,
      avg_quality_score: behavioralData.reduce((sum, d) => sum + d.data_quality_score, 0) / behavioralData.length,
      feature_usage: aggregateFeatureUsage(behavioralData),
      session_patterns: analyzeSessionPatterns(behavioralData),
      ai_interaction_insights: analyzeAIInteractions(behavioralData.filter(d => d.data_category === 'ai_interaction'))
    };

    const qualityScore = calculateBundleQuality(bundleMetadata);
    const marketValue = calculateMarketValue('behavioral', qualityScore, behavioralData.length);

    const { data: bundle, error: insertError } = await supabase
      .from('universal_data_bundles')
      .insert({
        bundle_category: 'behavioral',
        data_types: ['general', 'ai_interaction'],
        bundle_metadata: bundleMetadata,
        quality_score: qualityScore,
        market_value: marketValue,
        bundle_size_bytes: JSON.stringify(bundleMetadata).length,
        unique_users_count: new Set(behavioralData.map(d => d.pseudo_user_id)).size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating behavioral bundle:', insertError);
      return { success: false, category: 'behavioral' };
    }

    console.log('Behavioral bundle created:', bundle.id);
    return { success: true, category: 'behavioral', bundle_id: bundle.id, market_value: marketValue };

  } catch (error) {
    console.error('Error generating behavioral bundle:', error);
    return { success: false, category: 'behavioral' };
  }
}

async function generateSocialBundle(supabase: any, threshold: number, timeWindow: string) {
  try {
    console.log('Generating social dynamics bundle');
    
    const { data: socialData, error } = await supabase
      .from('staged_app_data')
      .select('*')
      .eq('data_category', 'social')
      .gte('processed_at', `now() - interval '${timeWindow}'`)
      .limit(1000);

    if (error || !socialData || socialData.length < threshold / 2) { // Lower threshold for social data
      console.log('Insufficient social data for bundling');
      return { success: false, category: 'social' };
    }

    const bundleMetadata = {
      data_points: socialData.length,
      network_growth_patterns: analyzeNetworkGrowth(socialData),
      trust_dynamics: analyzeTrustPatterns(socialData),
      engagement_trends: analyzeEngagementTrends(socialData),
      relationship_formation: analyzeRelationshipFormation(socialData)
    };

    const qualityScore = calculateBundleQuality(bundleMetadata);
    const marketValue = calculateMarketValue('social', qualityScore, socialData.length);

    const { data: bundle, error: insertError } = await supabase
      .from('universal_data_bundles')
      .insert({
        bundle_category: 'social',
        data_types: ['social'],
        bundle_metadata: bundleMetadata,
        quality_score: qualityScore,
        market_value: marketValue,
        bundle_size_bytes: JSON.stringify(bundleMetadata).length,
        unique_users_count: new Set(socialData.map(d => d.pseudo_user_id)).size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating social bundle:', insertError);
      return { success: false, category: 'social' };
    }

    console.log('Social bundle created:', bundle.id);
    return { success: true, category: 'social', bundle_id: bundle.id, market_value: marketValue };

  } catch (error) {
    console.error('Error generating social bundle:', error);
    return { success: false, category: 'social' };
  }
}

async function generateFinancialBundle(supabase: any, threshold: number, timeWindow: string) {
  try {
    console.log('Generating financial patterns bundle');
    
    const { data: walletData, error } = await supabase
      .from('staged_app_data')
      .select('*')
      .eq('data_category', 'wallet')
      .gte('processed_at', `now() - interval '${timeWindow}'`)
      .limit(1000);

    if (error || !walletData || walletData.length < threshold / 3) { // Lower threshold for financial data
      console.log('Insufficient wallet data for bundling');
      return { success: false, category: 'financial' };
    }

    const bundleMetadata = {
      data_points: walletData.length,
      transaction_patterns: analyzeTransactionPatterns(walletData),
      spending_behaviors: analyzeSpendingBehaviors(walletData),
      payment_preferences: analyzePaymentPreferences(walletData),
      financial_health_indicators: analyzeFinancialHealth(walletData)
    };

    const qualityScore = calculateBundleQuality(bundleMetadata);
    const marketValue = calculateMarketValue('financial', qualityScore, walletData.length);

    const { data: bundle, error: insertError } = await supabase
      .from('universal_data_bundles')
      .insert({
        bundle_category: 'financial',
        data_types: ['wallet'],
        bundle_metadata: bundleMetadata,
        quality_score: qualityScore,
        market_value: marketValue,
        bundle_size_bytes: JSON.stringify(bundleMetadata).length,
        unique_users_count: new Set(walletData.map(d => d.pseudo_user_id)).size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating financial bundle:', insertError);
      return { success: false, category: 'financial' };
    }

    console.log('Financial bundle created:', bundle.id);
    return { success: true, category: 'financial', bundle_id: bundle.id, market_value: marketValue };

  } catch (error) {
    console.error('Error generating financial bundle:', error);
    return { success: false, category: 'financial' };
  }
}

async function generateAIPatternBundle(supabase: any, threshold: number, timeWindow: string) {
  try {
    console.log('Generating AI interaction patterns bundle');
    
    const { data: aiData, error } = await supabase
      .from('staged_app_data')
      .select('*')
      .eq('data_category', 'ai_interaction')
      .gte('processed_at', `now() - interval '${timeWindow}'`)
      .limit(1000);

    if (error || !aiData || aiData.length < threshold / 2) {
      console.log('Insufficient AI interaction data for bundling');
      return { success: false, category: 'ai_patterns' };
    }

    const bundleMetadata = {
      data_points: aiData.length,
      interaction_modalities: analyzeInteractionModalities(aiData),
      topic_preferences: analyzeTopicPreferences(aiData),
      assistant_effectiveness: analyzeAssistantEffectiveness(aiData),
      user_satisfaction_trends: analyzeSatisfactionTrends(aiData)
    };

    const qualityScore = calculateBundleQuality(bundleMetadata);
    const marketValue = calculateMarketValue('ai_patterns', qualityScore, aiData.length);

    const { data: bundle, error: insertError } = await supabase
      .from('universal_data_bundles')
      .insert({
        bundle_category: 'ai_patterns',
        data_types: ['ai_interaction'],
        bundle_metadata: bundleMetadata,
        quality_score: qualityScore,
        market_value: marketValue,
        bundle_size_bytes: JSON.stringify(bundleMetadata).length,
        unique_users_count: new Set(aiData.map(d => d.pseudo_user_id)).size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating AI patterns bundle:', insertError);
      return { success: false, category: 'ai_patterns' };
    }

    console.log('AI patterns bundle created:', bundle.id);
    return { success: true, category: 'ai_patterns', bundle_id: bundle.id, market_value: marketValue };

  } catch (error) {
    console.error('Error generating AI patterns bundle:', error);
    return { success: false, category: 'ai_patterns' };
  }
}

async function generateCivicBundle(supabase: any, threshold: number, timeWindow: string) {
  try {
    console.log('Generating civic engagement bundle');
    
    const { data: votingData, error } = await supabase
      .from('staged_app_data')
      .select('*')
      .eq('data_category', 'voting')
      .gte('processed_at', `now() - interval '${timeWindow}'`)
      .limit(1000);

    if (error || !votingData || votingData.length < threshold / 4) {
      console.log('Insufficient voting data for bundling');
      return { success: false, category: 'civic' };
    }

    const bundleMetadata = {
      data_points: votingData.length,
      participation_patterns: analyzeParticipationPatterns(votingData),
      engagement_depth: analyzeEngagementDepth(votingData),
      governance_interests: analyzeGovernanceInterests(votingData),
      democratic_health_indicators: analyzeDemocraticHealth(votingData)
    };

    const qualityScore = calculateBundleQuality(bundleMetadata);
    const marketValue = calculateMarketValue('civic', qualityScore, votingData.length);

    const { data: bundle, error: insertError } = await supabase
      .from('universal_data_bundles')
      .insert({
        bundle_category: 'civic',
        data_types: ['voting'],
        bundle_metadata: bundleMetadata,
        quality_score: qualityScore,
        market_value: marketValue,
        bundle_size_bytes: JSON.stringify(bundleMetadata).length,
        unique_users_count: new Set(votingData.map(d => d.pseudo_user_id)).size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating civic bundle:', insertError);
      return { success: false, category: 'civic' };
    }

    console.log('Civic bundle created:', bundle.id);
    return { success: true, category: 'civic', bundle_id: bundle.id, market_value: marketValue };

  } catch (error) {
    console.error('Error generating civic bundle:', error);
    return { success: false, category: 'civic' };
  }
}

async function generateCommerceBundle(supabase: any, threshold: number, timeWindow: string) {
  try {
    console.log('Generating commerce behavior bundle');
    
    const { data: commerceData, error } = await supabase
      .from('staged_app_data')
      .select('*')
      .in('data_category', ['shopping', 'ar_experience'])
      .gte('processed_at', `now() - interval '${timeWindow}'`)
      .limit(1000);

    if (error || !commerceData || commerceData.length < threshold / 2) {
      console.log('Insufficient commerce data for bundling');
      return { success: false, category: 'commerce' };
    }

    const bundleMetadata = {
      data_points: commerceData.length,
      shopping_behaviors: analyzeShoppingBehaviors(commerceData),
      ar_commerce_engagement: analyzeARCommerce(commerceData),
      purchase_intent_patterns: analyzePurchaseIntent(commerceData),
      merchant_interaction_trends: analyzeMerchantInteractions(commerceData)
    };

    const qualityScore = calculateBundleQuality(bundleMetadata);
    const marketValue = calculateMarketValue('commerce', qualityScore, commerceData.length);

    const { data: bundle, error: insertError } = await supabase
      .from('universal_data_bundles')
      .insert({
        bundle_category: 'commerce',
        data_types: ['shopping', 'ar_experience'],
        bundle_metadata: bundleMetadata,
        quality_score: qualityScore,
        market_value: marketValue,
        bundle_size_bytes: JSON.stringify(bundleMetadata).length,
        unique_users_count: new Set(commerceData.map(d => d.pseudo_user_id)).size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating commerce bundle:', insertError);
      return { success: false, category: 'commerce' };
    }

    console.log('Commerce bundle created:', bundle.id);
    return { success: true, category: 'commerce', bundle_id: bundle.id, market_value: marketValue };

  } catch (error) {
    console.error('Error generating commerce bundle:', error);
    return { success: false, category: 'commerce' };
  }
}

// Analysis Functions (simplified for demo)
function aggregateFeatureUsage(data: any[]): any {
  const usage = {};
  data.forEach(d => {
    const feature = d.anonymized_payload.feature_used || 'unknown';
    usage[feature] = (usage[feature] || 0) + 1;
  });
  return usage;
}

function analyzeSessionPatterns(data: any[]): any {
  const sessionDurations = data.map(d => d.anonymized_payload.session_duration || 0);
  return {
    avg_duration: sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length,
    max_duration: Math.max(...sessionDurations),
    session_count: new Set(data.map(d => d.session_context?.session_id)).size
  };
}

function analyzeAIInteractions(data: any[]): any {
  const interactions = data.map(d => d.anonymized_payload);
  const totalInteractions = interactions.length;
  const voiceUsage = interactions.filter(i => i.interaction_type === 'voice' || i.interaction_type === 'mixed').length;
  
  return {
    total_interactions: totalInteractions,
    voice_usage_rate: totalInteractions > 0 ? voiceUsage / totalInteractions : 0,
    avg_conversation_length: interactions.reduce((sum, i) => sum + (i.conversation_length || 0), 0) / totalInteractions,
    satisfaction_rate: interactions.filter(i => i.response_satisfaction > 0.7).length / totalInteractions
  };
}

function analyzeNetworkGrowth(data: any[]): any {
  const networkChanges = data.map(d => d.anonymized_payload.network_size_impact || 0);
  return {
    total_connections_added: networkChanges.filter(c => c > 0).length,
    avg_network_impact: networkChanges.reduce((sum, c) => sum + c, 0) / networkChanges.length
  };
}

function analyzeTrustPatterns(data: any[]): any {
  const trustChanges = data.map(d => d.anonymized_payload.trust_score_change || 0);
  return {
    trust_improvements: trustChanges.filter(t => t > 0).length,
    avg_trust_change: trustChanges.reduce((sum, t) => sum + t, 0) / trustChanges.length
  };
}

function analyzeEngagementTrends(data: any[]): any {
  const engagements = data.map(d => d.anonymized_payload.engagement_level || 0);
  return {
    avg_engagement: engagements.reduce((sum, e) => sum + e, 0) / engagements.length,
    high_engagement_rate: engagements.filter(e => e > 0.7).length / engagements.length
  };
}

function analyzeRelationshipFormation(data: any[]): any {
  const relationshipTypes = {};
  data.forEach(d => {
    const type = d.anonymized_payload.interaction_type || 'unknown';
    relationshipTypes[type] = (relationshipTypes[type] || 0) + 1;
  });
  return relationshipTypes;
}

function analyzeTransactionPatterns(data: any[]): any {
  const amounts = data.map(d => d.anonymized_payload.amount_range);
  const frequencies = data.map(d => d.anonymized_payload.transaction_frequency || 1);
  
  return {
    amount_distribution: amounts.reduce((acc, amount) => {
      acc[amount] = (acc[amount] || 0) + 1;
      return acc;
    }, {}),
    avg_frequency: frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length
  };
}

function analyzeSpendingBehaviors(data: any[]): any {
  const timeCategories = data.map(d => d.anonymized_payload.time_of_day);
  return {
    preferred_times: timeCategories.reduce((acc, time) => {
      acc[time] = (acc[time] || 0) + 1;
      return acc;
    }, {})
  };
}

function analyzePaymentPreferences(data: any[]): any {
  const methods = data.map(d => d.anonymized_payload.payment_method);
  return {
    method_distribution: methods.reduce((acc, method) => {
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {})
  };
}

function analyzeFinancialHealth(data: any[]): any {
  return {
    transaction_diversity: new Set(data.map(d => d.anonymized_payload.transaction_type)).size,
    spending_regularity: data.filter(d => d.anonymized_payload.transaction_frequency > 1).length / data.length
  };
}

function analyzeInteractionModalities(data: any[]): any {
  const modalities = data.map(d => d.anonymized_payload.interaction_type);
  return {
    modality_distribution: modalities.reduce((acc, modality) => {
      acc[modality] = (acc[modality] || 0) + 1;
      return acc;
    }, {})
  };
}

function analyzeTopicPreferences(data: any[]): any {
  const topics = data.flatMap(d => d.anonymized_payload.topics_discussed || []);
  return {
    topic_frequency: topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {})
  };
}

function analyzeAssistantEffectiveness(data: any[]): any {
  const errorCounts = data.map(d => d.anonymized_payload.error_count || 0);
  return {
    avg_errors: errorCounts.reduce((sum, e) => sum + e, 0) / errorCounts.length,
    error_free_rate: errorCounts.filter(e => e === 0).length / errorCounts.length
  };
}

function analyzeSatisfactionTrends(data: any[]): any {
  const satisfactions = data.map(d => d.anonymized_payload.response_satisfaction).filter(s => s !== undefined);
  return {
    avg_satisfaction: satisfactions.reduce((sum, s) => sum + s, 0) / satisfactions.length,
    high_satisfaction_rate: satisfactions.filter(s => s > 0.8).length / satisfactions.length
  };
}

function analyzeParticipationPatterns(data: any[]): any {
  const frequencies = data.map(d => d.anonymized_payload.voting_frequency || 1);
  return {
    avg_participation_frequency: frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length,
    regular_voters: frequencies.filter(f => f > 3).length / frequencies.length
  };
}

function analyzeEngagementDepth(data: any[]): any {
  const engagementTimes = data.map(d => d.anonymized_payload.engagement_time || 0);
  const researchActions = data.map(d => d.anonymized_payload.research_behavior?.length || 0);
  
  return {
    avg_engagement_time: engagementTimes.reduce((sum, t) => sum + t, 0) / engagementTimes.length,
    avg_research_actions: researchActions.reduce((sum, r) => sum + r, 0) / researchActions.length
  };
}

function analyzeGovernanceInterests(data: any[]): any {
  const categories = data.map(d => d.anonymized_payload.proposal_category).filter(c => c);
  return {
    category_interests: categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {})
  };
}

function analyzeDemocraticHealth(data: any[]): any {
  return {
    participation_rate: data.length, // Proxy for engagement
    research_engagement: data.filter(d => d.anonymized_payload.research_behavior?.length > 0).length / data.length
  };
}

function analyzeShoppingBehaviors(data: any[]): any {
  const shoppingData = data.filter(d => d.data_category === 'shopping');
  const sessionDurations = shoppingData.map(d => d.anonymized_payload.session_duration || 0);
  
  return {
    avg_session_duration: sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length,
    ar_engagement_rate: shoppingData.filter(d => d.anonymized_payload.ar_engagement > 0).length / shoppingData.length
  };
}

function analyzeARCommerce(data: any[]): any {
  const arData = data.filter(d => d.data_category === 'ar_experience');
  return {
    ar_adoption_rate: arData.length / data.length,
    conversion_rate: arData.filter(d => d.anonymized_payload.conversion_action).length / Math.max(arData.length, 1)
  };
}

function analyzePurchaseIntent(data: any[]): any {
  const intents = data.map(d => d.anonymized_payload.purchase_intent || 0).filter(i => i > 0);
  return {
    avg_intent_score: intents.reduce((sum, i) => sum + i, 0) / Math.max(intents.length, 1),
    high_intent_rate: intents.filter(i => i > 0.7).length / Math.max(intents.length, 1)
  };
}

function analyzeMerchantInteractions(data: any[]): any {
  const categories = data.flatMap(d => d.anonymized_payload.product_categories || []);
  return {
    category_diversity: new Set(categories).size,
    most_popular_categories: categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  };
}

function calculateBundleQuality(metadata: any): number {
  let score = 0.5; // Base score
  
  // Data volume score
  if (metadata.data_points > 100) score += 0.2;
  else if (metadata.data_points > 50) score += 0.1;
  
  // Diversity score
  if (metadata.unique_sessions > 10) score += 0.1;
  if (metadata.category_diversity > 3) score += 0.1;
  
  // Quality indicators
  if (metadata.avg_quality_score > 0.7) score += 0.1;
  
  return Math.min(score, 1.0);
}

function calculateMarketValue(category: string, qualityScore: number, dataPoints: number): number {
  const baseValues = {
    'behavioral': 0.05,
    'social': 0.08,
    'financial': 0.12,
    'ai_patterns': 0.07,
    'civic': 0.06,
    'commerce': 0.10
  };
  
  const baseValue = baseValues[category] || 0.05;
  const volumeMultiplier = Math.min(dataPoints / 100, 3); // Cap at 3x
  const qualityMultiplier = 1 + qualityScore;
  
  return Math.round(baseValue * volumeMultiplier * qualityMultiplier * 100) / 100;
}