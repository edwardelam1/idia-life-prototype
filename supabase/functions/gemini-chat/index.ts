import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface GeminiRequest {
  function_name: string;
  arguments: Record<string, any>;
  user_data: Record<string, any>;
}

interface GeminiResponse {
  analysis: Record<string, any>;
  insights: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { function_name, arguments: args, user_data }: GeminiRequest = await req.json();

    // Prepare comprehensive prompt for Gemini 2.5 Pro
    const prompt = buildAnalysisPrompt(function_name, args, user_data);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          },
          systemInstruction: {
            parts: [{
              text: `You are the analytical backend for "My Friend" AI, operating under strict ethical guidelines. 
              Your role is to provide structured JSON analysis of user data patterns across financial, health, social, and AR interaction domains.
              
              CRITICAL RULES:
              - Never provide clinical diagnoses or medical advice
              - Focus on patterns and correlations, not causation
              - Maintain user privacy and dignity in all analysis
              - Output ONLY valid JSON in the specified schema
              - Be sensitive to cultural and individual differences
              
              Your analysis should support user autonomy, competence, and relatedness according to Self-Determination Theory.`
            }]
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiResult = await response.json();
    const analysisText = geminiResult.candidates[0].content.parts[0].text;
    
    // Parse the JSON response from Gemini
    const analysis: GeminiResponse = JSON.parse(analysisText);

    return new Response(JSON.stringify(analysis), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return new Response(
      JSON.stringify({ error: "Analysis failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildAnalysisPrompt(functionName: string, args: Record<string, any>, userData: Record<string, any>): string {
  const basePrompt = `
Analyze the following user data and provide insights in JSON format.

Function: ${functionName}
Arguments: ${JSON.stringify(args)}

User Data:
${JSON.stringify(userData, null, 2)}

Required JSON Schema:
{
  "analysis": {
    "patterns": [
      {
        "domain": "financial|health|social|ar_interaction",
        "pattern_type": "string",
        "description": "string",
        "confidence": 0.0-1.0,
        "supporting_data": ["string"]
      }
    ],
    "correlations": [
      {
        "domain_1": "string",
        "domain_2": "string", 
        "correlation_strength": 0.0-1.0,
        "description": "string"
      }
    ],
    "trends": [
      {
        "metric": "string",
        "direction": "increasing|decreasing|stable",
        "timeframe": "string",
        "significance": "low|medium|high"
      }
    ]
  },
  "insights": [
    "Human-readable insight about patterns discovered"
  ],
  "recommendations": [
    "Actionable recommendation based on analysis"
  ],
  "privacy_notes": [
    "Any privacy considerations or data limitations"
  ]
}
`;

  // Add function-specific context
  switch (functionName) {
    case "analyzeAnxietyTriggers":
      return basePrompt + `
Focus on correlations between emotional states (from journal entries) and financial behaviors.
Look for stress indicators in spending patterns and AR interaction engagement levels.
Consider temporal patterns and provide gentle, supportive recommendations.`;

    case "analyzeFinancialWellbeing":
      return basePrompt + `
Analyze spending patterns, earning consistency, and financial goal progress.
Consider AR-driven purchases and their impact on overall financial health.
Provide insights about financial autonomy and competence building.`;

    case "analyzeSocialConnections":
      return basePrompt + `
Examine social graph interactions, trust circle activity, and community engagement.
Include AR social experiences and collaborative activities.
Focus on relatedness and social support patterns.`;

    case "analyzeProductivityPatterns":
      return basePrompt + `
Look at work-life balance indicators across financial activity, health metrics, and social engagement.
Consider how AR experiences might enhance or distract from productivity.
Provide recommendations for optimizing daily routines.`;

    default:
      return basePrompt + `
Provide a comprehensive analysis across all available data domains.
Focus on holistic patterns that support user well-being and growth.`;
  }
}