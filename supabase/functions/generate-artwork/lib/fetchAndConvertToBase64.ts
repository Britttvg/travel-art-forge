// Fetch and convert image to base64
export async function fetchAndConvertToBase64(photoUrl: string): Promise<{ base64: string, contentType: string, imageSize: number, dataUrl: string }> {
  const response = await fetch(photoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TravelArtForge/1.0)',
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const imageSize = arrayBuffer.byteLength;
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCodePoint(bytes[i]);
  }
  const base64 = btoa(binary);
  const dataUrl = `data:${contentType};base64,${base64}`;
  return { base64, contentType, imageSize, dataUrl };
}
