// Generate artwork with AI
export async function generateArtworkWithAI(base64Images: any[], artworkPrompt: string, artStyle: string, lovableApiKey: string, currentModel: string) {
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
              text: artworkPrompt
            }
          ]
        }
      ],
      modalities: ['image', 'text']
    })
  });
  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`AI Gateway error: ${errorText}`);
  }
  const aiData = await aiResponse.json();
  return aiData;
}
