import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  collectionId: string;
  onPhotoUploaded: () => void;
}

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

export function PhotoUpload({ collectionId, onPhotoUploaded }: Readonly<PhotoUploadProps>) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true
  });

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload photos",
          variant: "destructive"
        });
        return;
      }

      for (const uploadedFile of uploadedFiles) {
        const fileExt = uploadedFile.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('travel-photos')
          .upload(fileName, uploadedFile.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Save photo metadata to database
        const { error: dbError } = await supabase
          .from('travel_photos')
          .insert({
            collection_id: collectionId,
            file_path: fileName,
            original_name: uploadedFile.file.name,
            file_size: uploadedFile.file.size,
            mime_type: uploadedFile.file.type
          });

        if (dbError) {
          console.error('Database error:', dbError);
        }
      }

      toast({
        title: "Photos uploaded successfully",
        description: `${uploadedFiles.length} photos uploaded to your collection`
      });

      // Clean up
      uploadedFiles.forEach(file => URL.revokeObjectURL(file.preview));
      setUploadedFiles([]);
      onPhotoUploaded();

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed transition-colors hover:border-primary/50">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`cursor-pointer text-center transition-colors ${
              isDragActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 mb-4 animate-float" />
            <h3 className="text-lg font-semibold mb-2">Upload Travel Photos</h3>
            <p className="text-sm">
              Drag & drop your travel photos here, or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports JPEG, PNG, WebP (max 20MB each)
            </p>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">Selected Photos ({uploadedFiles.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden shadow-soft">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {file.file.name}
                </p>
              </div>
            ))}
          </div>
          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full bg-gradient-primary hover:opacity-90 shadow-elegant"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : `Upload ${uploadedFiles.length} Photo${uploadedFiles.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}