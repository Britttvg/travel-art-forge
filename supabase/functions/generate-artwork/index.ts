import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from "./lib/supabaseClient.js";
import { validateInput } from "./lib/validateInput.js";
import { fetchAndConvertToBase64 } from "./lib/fetchAndConvertToBase64.js";
import { validateImageWithAI } from "./lib/validateImageWithAI.js";
import { analyzePhotosWithAI } from "./lib/analyzePhotosWithAI.js";
import { generateArtworkWithAI } from "./lib/generateArtworkWithAI.js";
import { uploadToSupabaseStorage } from "./lib/uploadToSupabaseStorage.js";
import { insertArtworkRecord } from "./lib/insertArtworkRecord.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const currentModel = 'google/gemini-2.5-flash-image-preview';

// Style descriptions
const styleDescriptions: Record<string, string> = {
  impressionist: 'impressionist painting with visible brushstrokes and vibrant light',
  watercolor: 'soft watercolor painting with flowing colors and transparency',
  'oil-painting': 'rich oil painting with thick textures and bold colors',
  'digital-art': 'modern digital art with clean lines and vivid colors',
  abstract: 'abstract composition with geometric shapes and bold patterns',
  photorealistic: 'photorealistic rendering with perfect lighting and detail',
  anime: 'anime art style with expressive features and dramatic composition'
};

const detailedStyleInstructions: Record<string, string> = {
  impressionist: `IMPRESSIONIST STYLE REQUIREMENTS:
- Apply broken color technique with visible, textured brushstrokes
- Use warm and cool color contrasts to create luminous effects
- Implement plein air lighting with emphasis on natural light changes
- Create atmospheric perspective with softer edges in background
- Apply impasto technique for texture in key areas
- Use complementary colors placed side by side to create vibrancy
- Capture fleeting moments with loose, spontaneous brushwork
- Emphasize the play of light and shadow throughout the composition`,

  watercolor: `WATERCOLOR STYLE REQUIREMENTS:
- Apply transparent washes with visible paper texture showing through
- Use wet-on-wet techniques for soft, bleeding color effects
- Implement granulation and bloom effects characteristic of watercolor
- Create luminous whites by preserving paper areas
- Apply layered glazes for depth and color mixing
- Use controlled dripping and flowing effects
- Implement soft, feathered edges and gradual color transitions
- Apply salt texture effects and lifting techniques for natural variations`,

  'oil-painting': `OIL PAINTING STYLE REQUIREMENTS:
- Apply thick impasto brushwork with palette knife textures
- Use alla prima wet-on-wet blending techniques
- Implement chiaroscuro lighting with dramatic light/shadow contrasts
- Apply glazing techniques for deep, rich color depth
- Use scumbling for textural effects and atmospheric haze
- Create smooth color transitions through careful blending
- Apply broken color technique for vibrant surface effects
- Emphasize the physical presence of paint on canvas`,

  'digital-art': `DIGITAL ART STYLE REQUIREMENTS:
- Use clean, precise vector-like lines and shapes
- Apply gradient meshes and smooth color transitions
- Implement high contrast lighting with sharp shadows
- Use vibrant, saturated color palettes beyond traditional media
- Apply digital brush effects and custom textures
- Create sharp focus throughout with minimal atmospheric perspective
- Use geometric precision in composition and perspective
- Implement glowing effects and digital lighting phenomena`,

  abstract: `ABSTRACT STYLE REQUIREMENTS:
- Deconstruct recognizable forms into geometric shapes and patterns
- Use bold, contrasting color blocks and angular compositions
- Apply non-representational color relationships and harmonies
- Implement dynamic, asymmetrical balance in composition
- Use overlapping planes and fragmented perspectives
- Apply texture through pattern and repetition rather than naturalistic detail
- Create visual rhythm through repeated elements and color echoes
- Emphasize emotional expression over literal representation`,

  photorealistic: `PHOTOREALISTIC STYLE REQUIREMENTS:
- Render with precise detail and sharp focus throughout
- Apply accurate perspective and proportional relationships
- Use realistic lighting with proper cast shadows and reflections
- Implement subtle color variations and realistic skin tones
- Apply fine detail in textures, fabrics, and surface materials
- Use accurate atmospheric perspective and depth of field
- Create seamless blending without visible brushstrokes
- Emphasize clarity, precision, and lifelike representation`,

  anime: `ANIME STYLE REQUIREMENTS:
- Apply cel-shading technique with clean, defined shadows
- Use large, expressive eyes with detailed highlights and reflections
- Implement dynamic poses with exaggerated proportions
- Apply vibrant, saturated colors with high contrast
- Use clean, precise line art with varied line weights
- Create dramatic lighting effects and atmospheric backgrounds
- Apply stylized hair with gravity-defying movement and shine
- Emphasize emotional expression through facial features and body language`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 FUNCTION STARTED');
    console.log('📅 Timestamp:', new Date().toISOString());

    const reqData = await req.json();
    const { prompt, title, photoUrls, artStyle, userId, collectionId } = reqData;

    console.log('📝 REQUEST DATA RECEIVED:');
    console.log('  - Photo URLs count:', photoUrls?.length || 0);
    console.log('  - Art Style:', artStyle);

    validateInput({ photoUrls, userId, collectionId });

    const supabaseClient = getSupabaseClient(req);

    const styleDesc = styleDescriptions[artStyle] || styleDescriptions.impressionist;
    const detailedStyleInstruction = detailedStyleInstructions[artStyle] || detailedStyleInstructions.impressionist;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    console.log('Processing photos...');
    const base64Images = [];
    const imageValidationResults = [];

    for (let i = 0; i < photoUrls.length; i++) {
      const photoUrl = photoUrls[i];
      const { base64, contentType, imageSize, dataUrl } = await fetchAndConvertToBase64(photoUrl);
      const aiDescription = await validateImageWithAI(dataUrl, lovableApiKey, currentModel);

      imageValidationResults.push({
        index: i + 1,
        url: photoUrl,
        size: imageSize,
        contentType,
        base64Size: Math.round(base64.length / 1024),
        aiDescription
      });

      base64Images.push({
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'high' }
      });
    }

    console.log('Analyzing photos...');
    const photoAnalysis = await analyzePhotosWithAI(base64Images, photoUrls, styleDesc, lovableApiKey, currentModel);

    const analysisLength = photoAnalysis.length;
    const photoMentions = (photoAnalysis.match(/photo \d+/gi) || []).length;
    const peopleMentions = (photoAnalysis.match(/people?|person|man|woman|child/gi) || []).length;
    const buildingMentions = (photoAnalysis.match(/building|architecture|structure|monument/gi) || []).length;

    const artworkPrompt = `Based on the following detailed analysis of travel photo${photoUrls.length === 1 ? '' : 's'}, create a ${styleDesc} that incorporates ALL the specific visual elements mentioned:

PHOTO CONTENT ANALYSIS:
${photoAnalysis}

${detailedStyleInstruction}

USER REQUIREMENTS: ${prompt || 'Create a harmonious and visually stunning composition'}

MANDATORY CONSTRAINTS:
- Include every person mentioned in the analysis with their exact appearance, clothing, and poses
- Include every building, landmark, and architectural element described  
- Include all landscapes, natural features, and backgrounds mentioned
- Use the exact colors, lighting, and atmospheric conditions described
- Do not add any people, buildings, objects, or elements not mentioned in the analysis
- Maintain the authentic character and recognizable features of all described elements
- ${photoUrls.length === 1 ? 'Transform the photo content into' : 'Blend everything into'} a cohesive ${styleDesc} composition
- CRITICAL: Apply the style requirements listed above with precision and attention to the specific techniques mentioned`;

    console.log('Generating artwork...');
    const aiData = await generateArtworkWithAI(base64Images, artworkPrompt, artStyle, lovableApiKey, currentModel);

    let generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      aiData.choices?.[0]?.message?.images?.[0]?.url ||
      aiData.data?.[0]?.url;

    if (!generatedImageUrl) {
      const messageContent = aiData.choices?.[0]?.message?.content;
      if (typeof messageContent === 'string' && messageContent.includes('data:image')) {
        const base64Match = messageContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (base64Match) generatedImageUrl = base64Match[0];
      }
      if (!generatedImageUrl) throw new Error('No image in AI response');
    }

    let buffer: Uint8Array;
    if (generatedImageUrl.startsWith('data:')) {
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');
      buffer = Uint8Array.from(atob(base64Data), c => c.codePointAt(0) || 0);
    } else {
      const imageResponse = await fetch(generatedImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.status}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      buffer = new Uint8Array(arrayBuffer);
    }

    const fileName = `artwork-${Date.now()}.png`;
    const artworkUrl = await uploadToSupabaseStorage(supabaseClient, fileName, buffer);

    const artwork = await insertArtworkRecord(supabaseClient, {
      userId,
      collectionId,
      artworkUrl,
      title,
      prompt,
      artStyle,
      photoUrls,
      imageValidationResults,
      analysisLength,
      photoMentions,
      peopleMentions,
      buildingMentions,
      photoAnalysis
    });

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
