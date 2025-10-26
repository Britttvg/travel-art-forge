// Insert generated artwork record into Supabase database
export async function insertArtworkRecord(supabaseClient: any, {
  userId, collectionId, artworkUrl, title, prompt, artStyle, photoUrls, imageValidationResults, analysisLength, photoMentions, peopleMentions, buildingMentions, photoAnalysis
}: {
  userId: string,
  collectionId: string,
  artworkUrl: string,
  title: string,
  prompt: string,
  artStyle: string,
  photoUrls: string[],
  imageValidationResults: any[],
  analysisLength: number,
  photoMentions: number,
  peopleMentions: number,
  buildingMentions: number,
  photoAnalysis: string
}) {
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
      prompt_used: photoAnalysis
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  return artwork;
}
