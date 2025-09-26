/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../../../src/integrations/supabase/client'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
}

serve(async (req: { method: string; json: () => PromiseLike<{ prompt: string; photoId: string; userId: string; }> | { prompt: string; photoId: string; userId: string; }; }) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, photoId, userId } = await req.json()

    if (!prompt || !photoId || !userId) {
      throw new Error('Prompt, photoId, and userId are required')
    }

    console.log('Generating artwork with prompt:', prompt)

    // Call Ollama API running locally
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tinyllama',
        prompt: `Create an artistic description for generating artwork based on this prompt: ${prompt}. Focus on artistic style, colors, mood, and visual elements.`,
        stream: false
      }),
    })

    if (!ollamaResponse.ok) {
      console.error('Ollama API error:', ollamaResponse.status, ollamaResponse.statusText)
      throw new Error(`Ollama API error: ${ollamaResponse.status}`)
    }

    const ollamaData: OllamaResponse = await ollamaResponse.json()
    const artisticDescription = ollamaData.response

    console.log('Generated artistic description:', artisticDescription)

    // Store the generated artwork description in the database
    const { data: artwork, error } = await supabase
      .from('generated_artworks')
      .insert({
        user_id: userId,
        collection_id: photoId, // Using photoId as collection_id for now
        artwork_url: `Generated description: ${artisticDescription}`,
        style_settings: { prompt: prompt },
        prompt_used: prompt
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('Artwork saved to database:', artwork.id)

    return new Response(
      JSON.stringify({
        artwork,
        description: artisticDescription
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in generate-artwork function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Make sure Ollama is running locally with tinyllama model installed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})