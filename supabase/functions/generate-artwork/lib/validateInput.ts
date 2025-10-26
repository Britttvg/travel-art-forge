// Input validation for generate-artwork function
export function validateInput({ photoUrls, userId, collectionId }: { photoUrls: string[]; userId: string; collectionId: string; }) {
  if (!photoUrls || photoUrls.length < 1 || !userId || !collectionId) {
    throw new Error('At least 1 photo URL, userId, and collectionId are required');
  }
  for (const photoUrl of photoUrls) {
    if (!photoUrl || typeof photoUrl !== 'string') {
      throw new Error(`Invalid photo URL: ${photoUrl}`);
    }
  }
}
