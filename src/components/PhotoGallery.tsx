import { useState, useEffect } from "react";
import { Palette, Sparkles, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

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
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [artStyle, setArtStyle] = useState("impressionist");
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handleDeletePhotos = async () => {
    setDeleting(true);
    try {
      const photoIds = Array.from(selectedPhotos);
      const photosToDelete = photos.filter((p) => selectedPhotos.has(p.id));

      // Delete from storage
      for (const photo of photosToDelete) {
        const { error: storageError } = await supabase.storage.from("travel-photos").remove([photo.file_path]);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
        }
      }

      // Delete from database
      const { error } = await supabase.from("travel_photos").delete().in("id", photoIds);

      if (error) throw error;

      toast({
        title: "Photos deleted",
        description: `${photoIds.length} photo${photoIds.length > 1 ? "s" : ""} deleted successfully.`,
      });

      // Remove from local state
      setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete photos",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const generateArtwork = async () => {
    if (selectedPhotos.size < 2 || !prompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please select at least 2 photos and enter a prompt",
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

      const selectedPhotoUrls = photos.filter((p) => selectedPhotos.has(p.id)).map((p) => getPhotoUrl(p.file_path));

      const { data, error } = await supabase.functions.invoke("generate-artwork", {
        body: {
          photoUrls: selectedPhotoUrls,
          prompt: prompt.trim(),
          artStyle,
          userId: user.id,
          collectionId: collectionId,
        },
      });

      if (error) throw error;

      toast({
        title: "Artwork generated successfully!",
        description: "Your AI-generated artwork has been created",
      });
      setSelectedPhotos(new Set());
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
    <div className="space-y-4">
      {selectedPhotos.size > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedPhotos.size} photo{selectedPhotos.size > 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-2">
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                }
                title="Delete Photos?"
                description={`Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? "s" : ""}? This action cannot be undone.`}
                onConfirm={handleDeletePhotos}
                isDeleting={deleting}
                itemCount={selectedPhotos.size}
              />
              {selectedPhotos.size >= 2 && (
                <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary hover:opacity-90">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Art
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => {
          const isSelected = selectedPhotos.has(photo.id);
          return (
            <Card key={photo.id} className={`group overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-300 cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`} onClick={() => togglePhotoSelection(photo.id)}>
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={getPhotoUrl(photo.file_path)}
                    alt={photo.original_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                      target.alt = "Image not available";
                    }}
                  />
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "bg-background/80 border-border"}`}>{isSelected && <Check className="h-4 w-4 text-primary-foreground" />}</div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{photo.original_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(photo.uploaded_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setPrompt("");
            setArtStyle("impressionist");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate Artwork from {selectedPhotos.size} Photos</DialogTitle>
            <DialogDescription>Combine your selected photos into a beautiful AI-generated artwork</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              {photos
                .filter((p) => selectedPhotos.has(p.id))
                .map((photo) => (
                  <div key={photo.id} className="aspect-square relative rounded-lg overflow-hidden">
                    <img src={getPhotoUrl(photo.file_path)} alt={photo.original_name} className="w-full h-full object-cover" />
                  </div>
                ))}
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="style">Art Style</Label>
                <Select value={artStyle} onValueChange={setArtStyle}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressionist">Impressionist Painting</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                    <SelectItem value="oil-painting">Oil Painting</SelectItem>
                    <SelectItem value="digital-art">Digital Art</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="photorealistic">Photorealistic</SelectItem>
                    <SelectItem value="anime">Anime Style</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prompt">Additional Details</Label>
                <Textarea id="prompt" placeholder="Add any specific details about mood, colors, composition..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1" />
              </div>
              <Button onClick={generateArtwork} disabled={generating || selectedPhotos.size < 2 || !prompt} className="w-full bg-gradient-primary hover:opacity-90">
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? "Generating Artwork..." : "Generate Artwork"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
