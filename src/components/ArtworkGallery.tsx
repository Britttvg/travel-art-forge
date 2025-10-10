import { useState, useEffect } from "react";
import { Palette, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

      <div className="space-y-4">
        {artworks.map((artwork) => (
          <Card key={artwork.id} className="shadow-soft hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{artwork.title || t("artwork.aiGeneratedTitle")}</CardTitle>
                <div className="flex items-center gap-2">
                  <ConfirmDeleteDialog
                    trigger={
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    }
                    title={t("artwork.deleteConfirmTitle")}
                    description={`${t("artwork.deleteConfirmDescription")} ${t("common.undoWarning")}`}
                    onConfirm={() => handleDelete(artwork.id)}
                    isDeleting={deleting}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="rounded-lg overflow-hidden border shadow-md mb-2">
                  <img
                    src={artwork.artwork_url}
                    alt="Generated AI artwork"
                    className="w-full h-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                      target.alt = "Image not available";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground break-all">{artwork.artwork_url}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>
                  {t("artwork.createdOn")} {new Date(artwork.created_at).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
