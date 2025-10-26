import { insertArtworkRecord } from '../lib/insertArtworkRecord.ts';

describe('insertArtworkRecord', () => {
  it('should throw for invalid client', async () => {
    await expect(insertArtworkRecord({}, {
      userId: '1', collectionId: '2', artworkUrl: 'url', title: 't', prompt: 'p', artStyle: 'a', photoUrls: [], imageValidationResults: [], analysisLength: 1, photoMentions: 1, peopleMentions: 1, buildingMentions: 1, photoAnalysis: 'x'
    })).rejects.toThrow();
  });
});
