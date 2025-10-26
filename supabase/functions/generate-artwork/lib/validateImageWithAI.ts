// AI validation of images
export async function validateImageWithAI(dataUrl: string, lovableApiKey: string, currentModel: string) {
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
  if (validationResponse.ok) {
    const validationData = await validationResponse.json();
    return validationData.choices?.[0]?.message?.content || 'AI could not describe image';
  }
  return 'No validation available';
}
