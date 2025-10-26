// Upload image buffer to Supabase storage
export async function uploadToSupabaseStorage(supabaseClient: any, fileName: string, buffer: Uint8Array) {
  const { error: uploadError } = await supabaseClient.storage
    .from('generated-artworks')
    .upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: false
    });
  if (uploadError) {
    throw new Error(`Upload error: ${uploadError.message}`);
  }
  const { data: urlData } = supabaseClient.storage
    .from('generated-artworks')
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}
