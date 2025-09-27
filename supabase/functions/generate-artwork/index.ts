import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with proper auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { prompt, photoId, userId, collectionId } = await req.json();

    if (!prompt || !photoId || !userId || !collectionId) {
      throw new Error('Prompt, photoId, userId, and collectionId are required');
    }

    console.log('Generating artwork with prompt:', prompt);

    // Generate artistic description using a simple template for now
    // TODO: Replace with actual AI service (OpenAI, Anthropic, etc.)
    const artisticDescription = `Create a beautiful artwork inspired by "${prompt}". 

    Style: Dreamy impressionist painting with vibrant colors
    Mood: Peaceful and contemplative 
    Colors: Warm golden hour lighting with soft pastels
    Composition: Sweeping landscapes with gentle curves and flowing lines
    Medium: Oil painting with visible brushstrokes
    Atmosphere: Ethereal and romantic with soft focus effects
    
    This artwork should capture the essence of travel and adventure, transforming your photo into a masterpiece that evokes wanderlust and artistic beauty.`;

    console.log('Generated artistic description:', artisticDescription);

    // Store the generated artwork description in the database
    const { data: artwork, error } = await supabaseClient
      .from('generated_artworks')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        artwork_url: `Generated description: ${artisticDescription}`,
        style_settings: { prompt: prompt },
        prompt_used: prompt
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Artwork saved to database:', artwork.id);

    return new Response(
      JSON.stringify({
        artwork,
        description: artisticDescription
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-artwork function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Error generating artwork description'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});