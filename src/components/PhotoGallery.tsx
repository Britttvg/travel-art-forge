import { useState, useEffect } from "react";
import { Palette, Sparkles, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useLanguage } from "@/components/LanguageProvider";

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
  const [artworkTitle, setArtworkTitle] = useState("");
  const [artStyle, setArtStyle] = useState("impressionist");
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

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
        title: t("photos.errors.loadFailed"),
        description: t("photos.errors.refreshPage"),
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
        title: t("photos.deleted"),
        description: `${photoIds.length} ${t(photoIds.length > 1 ? "photos.deletedMultiple" : "photos.deletedSingle")}`,
      });

      // Remove from local state
      setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: t("photos.errors.deleteFailed"),
        description: t("photos.errors.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const generateArtwork = async () => {
    if (selectedPhotos.size < 1 || !artworkTitle.trim()) {
      toast({
        title: t("artwork.errors.missingInfo"),
        description: t("artwork.errors.selectPhotosPrompt"),
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
          title: t("auth.required"),
          description: t("auth.signInToGenerate"),
          variant: "destructive",
        });
        return;
      }

      const selectedPhotoUrls = photos.filter((p) => selectedPhotos.has(p.id)).map((p) => getPhotoUrl(p.file_path));

      const { data, error } = await supabase.functions.invoke("generate-artwork", {
        body: {
          photoUrls: selectedPhotoUrls,
          prompt: prompt.trim(),
          title: artworkTitle.trim(),
          artStyle,
          userId: user.id,
          collectionId: collectionId,
        },
      });

      if (error) throw error;

      toast({
        title: t("artwork.success.title"),
        description: t("artwork.success.description"),
      });
      setSelectedPhotos(new Set());
      setPrompt("");
      setArtworkTitle("");
      setDialogOpen(false);
      if (onArtworkGenerated) onArtworkGenerated();
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: t("artwork.errors.generationFailed"),
        description: t("artwork.errors.tryAgain"),
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
        <h3 className="text-lg font-semibold mb-2">{t("photos.noPhotos")}</h3>
        <p className="text-muted-foreground">{t("photos.uploadToStart")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedPhotos.size === 0 && (
        <div className="text-center">
          <p className="text-muted-foreground">{t("photos.selectToStart")}</p>
        </div>
      )}

      {selectedPhotos.size > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedPhotos.size} {t(selectedPhotos.size > 1 ? "photos.photosSelected" : "photos.photoSelected")}
            </p>
            <div className="flex gap-2">
              {selectedPhotos.size >= 1 && (
                <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary hover:opacity-90">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("artwork.generate")}
                </Button>
              )}
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="destructive">
                    <Trash2 />
                  </Button>
                }
                title={t("photos.deleteConfirmTitle")}
                description={`${t("photos.deleteConfirmDescription")} ${selectedPhotos.size} ${t(selectedPhotos.size > 1 ? "photos.photos" : "photos.photo")}? ${t("common.undoWarning")}`}
                onConfirm={handleDeletePhotos}
                isDeleting={deleting}
                itemCount={selectedPhotos.size}
              />
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
            setArtworkTitle("");
            setArtStyle("impressionist");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t("artwork.dialogTitle")} {selectedPhotos.size} {t(selectedPhotos.size > 1 ? "photos.photos" : "photos.photo")}
            </DialogTitle>
            <DialogDescription>{t("artwork.dialogDescription")}</DialogDescription>
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
                <Label htmlFor="title">{t("artwork.title")}</Label>
                <Input id="title" placeholder={t("artwork.titlePlaceholder")} value={artworkTitle} onChange={(e) => setArtworkTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="style">{t("artwork.style")}</Label>
                <Select value={artStyle} onValueChange={setArtStyle}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressionist">{t("artwork.styles.impressionist")}</SelectItem>
                    <SelectItem value="watercolor">{t("artwork.styles.watercolor")}</SelectItem>
                    <SelectItem value="oil-painting">{t("artwork.styles.oilPainting")}</SelectItem>
                    <SelectItem value="digital-art">{t("artwork.styles.digitalArt")}</SelectItem>
                    <SelectItem value="abstract">{t("artwork.styles.abstract")}</SelectItem>
                    <SelectItem value="photorealistic">{t("artwork.styles.photorealistic")}</SelectItem>
                    <SelectItem value="anime">{t("artwork.styles.anime")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prompt">{t("artwork.additionalDetails")}</Label>
                <Textarea id="prompt" placeholder={t("artwork.promptPlaceholder")} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1" />
              </div>
              <Button onClick={generateArtwork} disabled={generating || selectedPhotos.size < 1 || !artworkTitle.trim()} className="w-full bg-gradient-primary hover:opacity-90">
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? t("artwork.generating") : t("artwork.generate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
