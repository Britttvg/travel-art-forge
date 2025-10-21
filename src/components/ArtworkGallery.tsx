import { useState, useEffect } from "react";
import { Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useLanguage } from "@/components/LanguageProvider";

interface GeneratedArtwork {
  id: string;
  artwork_url: string;
  collection_id: string;
  user_id: string;
  style_settings: unknown;
  prompt_used: string | null;
  title: string | null;
  created_at: string;
  is_favorite: boolean | null;
}

interface ArtworkGalleryProps {
  refreshTrigger: number;
  collectionId?: string;
}

export function ArtworkGallery({ refreshTrigger, collectionId }: Readonly<ArtworkGalleryProps>) {
  const [artworks, setArtworks] = useState<GeneratedArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<GeneratedArtwork | null>(null);
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("generated_artworks").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: t("artwork.deleted"),
        description: t("artwork.deletedSuccessfully"),
      });
      // Remove from local state
      setArtworks((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      toast({
        title: t("artwork.errors.deleteFailed"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchArtworks();
  }, [refreshTrigger, collectionId]);

  const fetchArtworks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("generated_artworks").select("*").eq("user_id", user.id);

      if (collectionId) {
        query = query.eq("collection_id", collectionId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setArtworks(data || []);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      toast({
        title: t("artwork.errors.loadFailed"),
        description: t("common.refreshPage"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: t("common.copiedToClipboard"),
        description: t("artwork.copiedDescription"),
      });
    } catch (error) {
      toast({
        title: t("common.errors.copyFailed"),
        description: t("common.errors.copyManually"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <Palette className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("artwork.noArtworks")}</h3>
        <p className="text-muted-foreground">{t("artwork.generateToSee")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("artwork.generatedArtworks")}</h2>
        <Badge variant="secondary" className="text-xs">
          {artworks.length} {t(artworks.length !== 1 ? "artwork.artworks" : "artwork.artwork")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {artworks.map((artwork) => (
          <Card key={artwork.id} className="shadow-soft hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium truncate">{artwork.title || t("artwork.aiGeneratedTitle")}</CardTitle>
                <ConfirmDeleteDialog
                  trigger={
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" aria-label="Delete">
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  }
                  title={t("artwork.deleteConfirmTitle")}
                  description={`${t("artwork.deleteConfirmDescription")} ${t("common.undoWarning")}`}
                  onConfirm={() => handleDelete(artwork.id)}
                  isDeleting={deleting}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <button className="rounded-lg overflow-hidden border shadow-md mb-2 aspect-square cursor-pointer hover:opacity-80 transition-opacity w-full p-0 bg-transparent" onClick={() => setSelectedArtwork(artwork)} aria-label={`Enlarge artwork: ${artwork.title || t("artwork.aiGeneratedTitle")}`}>
                  <img
                    src={artwork.artwork_url}
                    alt="Generated AI artwork"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                      target.alt = "Image not available";
                    }}
                  />
                </button>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                <div className="truncate mb-1">
                  {t("artwork.createdOn")} {new Date(artwork.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enlarged artwork modal */}
      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Enlarged Artwork</DialogTitle>
          </DialogHeader>
          {selectedArtwork && (
            <div className="relative">
              <h3 className="my-3 text-center text-lg font-medium">{selectedArtwork.title || t("artwork.aiGeneratedTitle")}</h3>
              <img
                src={selectedArtwork.artwork_url}
                alt="Generated AI artwork - enlarged view"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                  target.alt = "Image not available";
                }}
              />
              <p className="my-4 text-center text-sm text-muted-foreground">
                {t("artwork.createdOn")} {new Date(selectedArtwork.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
