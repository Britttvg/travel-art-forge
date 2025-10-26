import { uploadToSupabaseStorage } from '../lib/uploadToSupabaseStorage.ts';

describe('uploadToSupabaseStorage', () => {
  it('should throw for invalid client', async () => {
    await expect(uploadToSupabaseStorage({}, 'file.png', new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });
});
