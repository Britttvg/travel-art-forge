import { useState, useEffect } from "react";
import { Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Photo {
  id: string;
  file_path: string;
  original_name: string;
  uploaded_at: string;
}

interface PhotoGalleryProps {
  collectionId: string;
  refreshTrigger: number;
  onArtworkGenerated?: () => void;
}
export function PhotoGallery({ collectionId, refreshTrigger, onArtworkGenerated }: Readonly<PhotoGalleryProps>) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPhotos();
  }, [collectionId, refreshTrigger]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase.from("travel_photos").select("*").eq("collection_id", collectionId).order("uploaded_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast({
        title: "Failed to load photos",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (filePath: string) => {
    try {
      const { data } = supabase.storage.from("travel-photos").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Error getting photo URL:", error);
      return "/placeholder.svg";
    }
  };

  const generateArtwork = async () => {
    if (!selectedPhoto || !prompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a photo and enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to generate artwork",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-artwork", {
        body: {
          photoId: selectedPhoto.id,
          prompt: prompt.trim(),
          userId: user.id,
          collectionId: collectionId,
          photoUrl: getPhotoUrl(selectedPhoto.file_path),
        },
      });

      if (error) throw error;

      toast({
        title: "Artwork generated successfully!",
        description: "Your AI-generated artwork has been created",
      });
      setSelectedPhoto(null);
      setPrompt("");
      setDialogOpen(false);
      if (onArtworkGenerated) onArtworkGenerated();
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate artwork. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <Palette className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
        <p className="text-muted-foreground">Upload some travel photos to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <Card key={photo.id} className="group overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-0">
            <div className="aspect-square relative overflow-hidden">
              <img
                src={getPhotoUrl(photo.file_path)}
                alt={photo.original_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                  target.alt = "Image not available - Please upload photos to local Supabase";
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                      // Reset state when dialog closes
                      setSelectedPhoto(null);
                      setPrompt("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90"
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setDialogOpen(true);
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Art
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Generate Artwork from Photo</DialogTitle>
                      <DialogDescription>Select an artistic style and let AI transform your photo into beautiful artwork.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      {selectedPhoto && (
                        <div className="aspect-video relative rounded-lg overflow-hidden">
                          <img
                            src={getPhotoUrl(selectedPhoto.file_path)}
                            alt={selectedPhoto.original_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                              target.alt = "Image not available";
                            }}
                          />
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="prompt">Artwork Style Prompt</Label>
                          <Textarea id="prompt" placeholder="Describe the artistic style you want... (e.g., 'oil painting with impressionist style', 'watercolor landscape', 'digital art with cyberpunk aesthetics')" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="mt-1" autoFocus={false} />
                        </div>
                        <Button onClick={generateArtwork} disabled={generating || !prompt.trim()} className="w-full bg-gradient-primary hover:opacity-90">
                          <Sparkles className="mr-2 h-4 w-4" />
                          {generating ? "Generating Artwork..." : "Generate Artwork"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium truncate">{photo.original_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(photo.uploaded_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
