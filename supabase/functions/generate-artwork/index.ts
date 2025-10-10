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

    const { prompt, photoId, userId, collectionId, photoUrl } = await req.json();

    if (!prompt || !photoId || !userId || !collectionId || !photoUrl) {
      throw new Error('Prompt, photoId, userId, collectionId, and photoUrl are required');
    }

    console.log('Generating artwork with prompt and photo:', prompt, photoUrl);

    // Call Python Ollama API to generate artwork from photo and description
    const ollamaApiUrl = Deno.env.get('OLLAMA_PROXY_URL') ?? 'http://localhost:8000/api/ollama';
    const ollamaRes = await fetch(ollamaApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, photoUrl }),
    });
    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${await ollamaRes.text()}`);
    }
    const ollamaData = await ollamaRes.json();
    const artworkUrl = ollamaData.artwork_url || ollamaData.url || ollamaData.response || '';

    console.log('Generated artwork URL:', artworkUrl);

    // Store the generated artwork in the database
    const { data: artwork, error } = await supabaseClient
      .from('generated_artworks')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        artwork_url: artworkUrl,
        style_settings: { prompt, photoUrl },
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
        artwork_url: artworkUrl
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