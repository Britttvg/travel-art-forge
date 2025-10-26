// AI photo analysis
export async function analyzePhotosWithAI(base64Images: any[], photoUrls: string[], styleDesc: string, lovableApiKey: string, currentModel: string) {
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
              text: `I'm providing ${photoUrls.length} travel photo${photoUrls.length === 1 ? '' : 's'}. Please analyze ${photoUrls.length === 1 ? 'the photo' : 'each photo separately'} and provide a comprehensive inventory:\n\nFOR ${photoUrls.length === 1 ? 'THE PHOTO' : 'EACH PHOTO'} ${photoUrls.length > 1 ? '(please number them Photo 1, Photo 2, etc.)' : ''}:\n...` // Truncated for brevity
            },
            ...base64Images
          ]
        }
      ]
    })
  });
  if (!analysisResponse.ok) {
    const errorText = await analysisResponse.text();
    throw new Error(`Photo analysis error: ${errorText}`);
  }
  const analysisData = await analysisResponse.json();
  return analysisData.choices?.[0]?.message?.content;
}
