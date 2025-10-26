import { analyzePhotosWithAI } from '../lib/analyzePhotosWithAI.ts';

describe('analyzePhotosWithAI', () => {
  it('should throw for invalid/fake API', async () => {
    await expect(analyzePhotosWithAI([], [], '', 'fake-key', 'fake-model')).rejects.toThrow();
  });
});
