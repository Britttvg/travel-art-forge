import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const currentModel = 'google/gemini-2.5-flash-image-preview';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 FUNCTION STARTED - Enhanced version with validation');
    console.log('📅 Timestamp:', new Date().toISOString());

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { prompt, title, photoUrls, artStyle, userId, collectionId } = await req.json();

    console.log('📝 REQUEST DATA RECEIVED:');
    console.log('  - Photo URLs count:', photoUrls?.length || 0);
    console.log('  - Art Style:', artStyle);
    console.log('  - User ID:', userId);
    console.log('  - Collection ID:', collectionId);
    console.log('  - Prompt:', prompt);

    if (!photoUrls || photoUrls.length < 1 || !userId || !collectionId) {
      throw new Error('At least 1 photo URL, userId, and collectionId are required');
    }

    console.log('🔍 First photo URL:', photoUrls[0]);

    console.log('Generating artwork from', photoUrls.length, 'photos with style:', artStyle);
    console.log('Photo URLs:', photoUrls);

    // Validate that photo URLs are accessible
    for (const photoUrl of photoUrls) {
      if (!photoUrl || typeof photoUrl !== 'string') {
        throw new Error(`Invalid photo URL: ${photoUrl}`);
      }
    }

    // Build the AI prompt based on style and user input
    const styleDescriptions: Record<string, string> = {
      impressionist: 'impressionist painting with visible brushstrokes and vibrant light',
      watercolor: 'soft watercolor painting with flowing colors and transparency',
      'oil-painting': 'rich oil painting with thick textures and bold colors',
      'digital-art': 'modern digital art with clean lines and vivid colors',
      abstract: 'abstract composition with geometric shapes and bold patterns',
      photorealistic: 'photorealistic rendering with perfect lighting and detail',
      anime: 'anime art style with expressive features and dramatic composition'
    };

    // Enhanced style-specific instructions for deeper artistic interpretation
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

    const styleDesc = styleDescriptions[artStyle] || styleDescriptions.impressionist;

    // Call Lovable AI Gateway to analyze and generate artwork
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Enhanced image preprocessing with validation and content verification
    console.log('Fetching and preprocessing photos with validation...');
    const base64Images = [];
    const imageValidationResults = [];

    for (let i = 0; i < photoUrls.length; i++) {
      const photoUrl = photoUrls[i];
      try {
        console.log(`Processing photo ${i + 1}/${photoUrls.length}:`, photoUrl);

        // Fetch the image
        const response = await fetch(photoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TravelArtForge/1.0)',
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch photo: ${response.status} ${response.statusText}`);
        }

        // Get image metadata
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const contentLength = response.headers.get('content-length');
        console.log(`Photo ${i + 1} - Type: ${contentType}, Size: ${contentLength} bytes`);

        // Validate image format
        if (!contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}. Expected image format.`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const imageSize = arrayBuffer.byteLength;

        // Validate image size and warn about large images
        if (imageSize < 1000) {
          throw new Error(`Image too small: ${imageSize} bytes. Might be corrupted.`);
        }

        if (imageSize > 5 * 1024 * 1024) { // 5MB limit for safety
          throw new Error(`Image too large: ${Math.round(imageSize / (1024 * 1024))}MB. Please use images smaller than 5MB to avoid processing issues.`);
        }

        if (imageSize > 2 * 1024 * 1024) { // 2MB warning
          console.warn(`Large image detected: ${Math.round(imageSize / (1024 * 1024))}MB. This might cause processing delays.`);
        }

        // Convert to base64 using proper method to avoid corruption
        let base64: string;
        let dataUrl: string;

        try {
          // Use a more reliable base64 conversion method
          let binary = '';
          const bytes = new Uint8Array(arrayBuffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCodePoint(bytes[i]);
          }
          base64 = btoa(binary);

          if (!base64 || base64.length < 100) {
            throw new Error('Base64 conversion resulted in invalid data');
          }

          dataUrl = `data:${contentType};base64,${base64}`;
          console.log(`✓ Base64 conversion successful: ${Math.round(base64.length / 1024)}KB`);

        } catch (error) {
          console.error(`Base64 conversion failed for photo ${i + 1}:`, error);
          throw new Error(`Failed to convert image to base64. Image might be corrupted or in an unsupported format.`);
        }

        // Test image readability with a quick AI validation
        console.log(`Validating photo ${i + 1} content with AI...`);
        const validationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: dataUrl,
                      detail: 'low'
                    }
                  },
                  {
                    type: 'text',
                    text: 'Describe this image in one sentence. What do you see?'
                  }
                ]
              }
            ]
          })
        });

        let validationResult = 'No validation available';
        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          validationResult = validationData.choices?.[0]?.message?.content || 'AI could not describe image';
        }

        imageValidationResults.push({
          index: i + 1,
          url: photoUrl,
          size: imageSize,
          contentType: contentType,
          base64Size: Math.round(base64.length / 1024),
          aiDescription: validationResult
        });

        base64Images.push({
          type: 'image_url',
          image_url: {
            url: dataUrl,
            detail: 'high'
          }
        });

        console.log(`✓ Photo ${i + 1} processed successfully:`);
        console.log(`  - Size: ${Math.round(imageSize / 1024)}KB`);
        console.log(`  - Base64: ${Math.round(base64.length / 1024)}KB`);
        console.log(`  - AI sees: ${validationResult.substring(0, 100)}...`);

      } catch (error) {
        console.error(`✗ Error processing photo ${i + 1}:`, photoUrl, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to process photo ${i + 1} (${photoUrl}). Error: ${errorMessage}`);
      }
    }

    // Log comprehensive validation summary
    console.log('\n=== IMAGE VALIDATION SUMMARY ===');
    for (const result of imageValidationResults) {
      console.log(`Photo ${result.index}:`);
      console.log(`  URL: ${result.url.substring(0, 60)}...`);
      console.log(`  Size: ${Math.round(result.size / 1024)}KB (${result.contentType})`);
      console.log(`  AI Description: ${result.aiDescription}`);
      console.log('---');
    }
    console.log('===============================\n');

    console.log(`Prepared ${base64Images.length} images for AI analysis`);

    // Final verification: Test if AI can process all images together
    console.log('Performing final batch processing test...');
    const batchTestResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `How many images do you see? List them briefly (one sentence each).`
              },
              ...base64Images
            ]
          }
        ]
      })
    });

    if (batchTestResponse.ok) {
      const batchTestData = await batchTestResponse.json();
      const batchTestResult = batchTestData.choices?.[0]?.message?.content;
      console.log('Batch processing test result:', batchTestResult);
    } else {
      console.warn('Batch processing test failed - AI may have trouble with multiple images');
    }

    // Enhanced photo analysis with detailed validation
    console.log('Performing comprehensive photo analysis with Gemini...');
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `I'm providing ${photoUrls.length} travel photo${photoUrls.length === 1 ? '' : 's'}. Please analyze ${photoUrls.length === 1 ? 'the photo' : 'each photo separately'} and provide a comprehensive inventory:

FOR ${photoUrls.length === 1 ? 'THE PHOTO' : 'EACH PHOTO'} ${photoUrls.length > 1 ? '(please number them Photo 1, Photo 2, etc.)' : ''}:

PEOPLE ANALYSIS:
- Count of people in the photo
- Each person's appearance (age, gender, ethnicity if identifiable)
- Clothing description (colors, style, specific items)
- Poses and positioning
- Facial expressions and features

ENVIRONMENT ANALYSIS:
- Setting type (urban, natural, indoor, etc.)
- Architecture (buildings, monuments, structures with specific details)
- Natural features (landscapes, water bodies, vegetation, sky conditions)
- Weather and lighting conditions
- Time of day indicators

OBJECTS & DETAILS:
- Vehicles, signs, furniture, decorations
- Colors (dominant color palette)
- Textures and materials visible
- Cultural or regional indicators
- Any unique or distinctive elements

COMPOSITION:
- Foreground, middle ground, background elements
- Perspective and viewpoint
- Overall mood and atmosphere

Please be extremely detailed and specific. This analysis will be used to create a ${styleDesc} artwork that must include ALL these elements authentically.`
              },
              ...base64Images
            ]
          }
        ]
      })
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Photo analysis error:', errorText);
      throw new Error(`Photo analysis error: ${errorText}`);
    }

    const analysisData = await analysisResponse.json();
    const photoAnalysis = analysisData.choices?.[0]?.message?.content;

    if (!photoAnalysis) {
      console.error('No analysis content returned. Full response:', JSON.stringify(analysisData, null, 2));
      throw new Error('Failed to analyze photos - no analysis returned from Gemini');
    }

    // Validate analysis quality
    const analysisLength = photoAnalysis.length;
    const photoMentions = (photoAnalysis.match(/photo \d+/gi) || []).length;
    const peopleMentions = (photoAnalysis.match(/people?|person|man|woman|child/gi) || []).length;
    const buildingMentions = (photoAnalysis.match(/building|architecture|structure|monument/gi) || []).length;

    console.log('\n=== ANALYSIS QUALITY CHECK ===');
    console.log(`Analysis length: ${analysisLength} characters`);
    console.log(`Photo references: ${photoMentions}`);
    console.log(`People mentions: ${peopleMentions}`);
    console.log(`Building mentions: ${buildingMentions}`);

    if (analysisLength < 200) {
      console.warn('⚠️  Analysis seems very short. May not be detailed enough.');
    }

    if (photoMentions < photoUrls.length) {
      console.warn(`⚠️  Expected ${photoUrls.length} photo references, found ${photoMentions}`);
    }

    console.log('\n=== FULL PHOTO ANALYSIS ===');
    console.log(photoAnalysis);
    console.log('==========================\n');

    // Create a more specific prompt for image generation
    const detailedStyleInstruction = detailedStyleInstructions[artStyle] || detailedStyleInstructions.impressionist;

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

    // Try using a different model or approach
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Here are the original photos I want you to reference:`
              },
              ...base64Images,
              {
                type: 'text',
                text: artworkPrompt + `

STYLE EMPHASIS: This is crucial - the artwork MUST demonstrate the specific artistic techniques and visual characteristics detailed in the style requirements above. The ${styleDesc} approach should be clearly evident in every aspect of the composition, from color application to texture rendering to lighting treatment.

Please generate a ${styleDesc} image that incorporates the specific visual elements from the photo${photoUrls.length === 1 ? '' : 's'} I provided above. The image should ${photoUrls.length === 1 ? 'transform the photo content' : 'combine all the people, buildings, landscapes, and other elements visible in the source photos'} into a cohesive artistic composition that exemplifies the ${artStyle} style.`
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received, checking for generated image...');

    // Try multiple possible response formats
    let generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      aiData.choices?.[0]?.message?.images?.[0]?.url ||
      aiData.data?.[0]?.url;

    if (generatedImageUrl) {
      console.log('Successfully received generated image from AI');
    } else {
      console.error('No image in AI response. Full response:', JSON.stringify(aiData, null, 2));

      // Try alternative approach - look for base64 content
      const messageContent = aiData.choices?.[0]?.message?.content;
      if (typeof messageContent === 'string' && messageContent.includes('data:image')) {
        const base64Match = messageContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (base64Match) {
          generatedImageUrl = base64Match[0];
          console.log('Found base64 image in message content');
        }
      }

      if (!generatedImageUrl) {
        console.log('Primary generation method failed, trying fallback approach...');

        // Fallback: Try a simpler direct generation with image references
        const fallbackResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              {
                role: 'user',
                content: [
                  ...base64Images,
                  {
                    type: 'text',
                    text: `Please create a ${styleDesc} artwork that directly incorporates and blends the visual elements from ${photoUrls.length === 1 ? 'the photo' : 'all the photos'} I've provided above. Include all people exactly as they appear, all buildings and landmarks, all landscapes and backgrounds. ${photoUrls.length === 1 ? 'Transform the photo content' : 'Combine them'} into a cohesive ${styleDesc} composition. 
                    
${detailedStyleInstruction}

${prompt || ''}`
                  }
                ]
              }
            ],
            modalities: ['image', 'text']
          })
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          generatedImageUrl = fallbackData.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
            fallbackData.choices?.[0]?.message?.images?.[0]?.url;

          if (generatedImageUrl) {
            console.log('Fallback generation succeeded');
          }
        }

        if (!generatedImageUrl) {
          throw new Error('Both primary and fallback image generation methods failed - check the logs above for details');
        }
      }
    }

    console.log('Generated artwork image');

    // Download and upload the generated image to Supabase storage
    let buffer: Uint8Array;

    if (generatedImageUrl.startsWith('data:')) {
      // Handle base64 data URL
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');
      buffer = Uint8Array.from(atob(base64Data), c => c.codePointAt(0) || 0);
    } else {
      // Handle regular URL - fetch the image
      console.log('Downloading generated image from:', generatedImageUrl);
      const imageResponse = await fetch(generatedImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.status}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      buffer = new Uint8Array(arrayBuffer);
    }

    const fileName = `artwork-${Date.now()}.png`;
    const { error: uploadError } = await supabaseClient.storage
      .from('generated-artworks')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('generated-artworks')
      .getPublicUrl(fileName);

    const artworkUrl = urlData.publicUrl;
    console.log('Uploaded artwork to:', artworkUrl);

    // Store the generated artwork in the database
    const { data: artwork, error } = await supabaseClient
      .from('generated_artworks')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        artwork_url: artworkUrl,
        title: title,
        style_settings: {
          prompt,
          artStyle,
          photoCount: photoUrls.length,
          validationSummary: {
            imageValidation: imageValidationResults,
            analysisStats: {
              length: analysisLength,
              photoMentions,
              peopleMentions,
              buildingMentions
            }
          }
        },
        prompt_used: photoAnalysis // Store the photo analysis for debugging
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