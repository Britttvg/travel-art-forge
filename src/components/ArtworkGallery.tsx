import { useState, useEffect } from "react";
import { Palette, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface GeneratedArtwork {
  id: string;
  artwork_url: string;
  collection_id: string;
  user_id: string;
  style_settings: unknown;
  prompt_used: string | null;
  created_at: string;
  is_favorite: boolean | null;
}

interface ArtworkGalleryProps {
  refreshTrigger: number;
}

export function ArtworkGallery({ refreshTrigger }: Readonly<ArtworkGalleryProps>) {
  const [artworks, setArtworks] = useState<GeneratedArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("generated_artworks").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Artwork deleted",
        description: "The artwork was deleted successfully.",
      });
      // Remove from local state
      setArtworks((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchArtworks();
  }, [refreshTrigger]);

  const fetchArtworks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("generated_artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

      if (error) throw error;
      setArtworks(data || []);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      toast({
        title: "Failed to load artworks",
        description: "Please try refreshing the page",
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
        title: "Copied to clipboard",
        description: "Artwork description copied successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try selecting and copying manually",
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
        <h3 className="text-lg font-semibold mb-2">No artworks generated yet</h3>
        <p className="text-muted-foreground">Generate some artwork descriptions from your photos to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Generated Artworks</h2>
        <Badge variant="secondary" className="text-xs">
          {artworks.length} artwork{artworks.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-4">
        {artworks.map((artwork) => (
          <Card key={artwork.id} className="shadow-soft hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">AI-Generated Artwork Description</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={artwork.is_favorite ? "default" : "secondary"} className="text-xs">
                    {artwork.is_favorite ? "Favorite" : "Standard"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(artwork.prompt_used || "", artwork.id)} className="h-8 w-8 p-0" aria-label="Copy">
                    {copiedId === artwork.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    }
                    title="Delete Artwork?"
                    description="Are you sure you want to delete this artwork? This action cannot be undone."
                    onConfirm={() => handleDelete(artwork.id)}
                    isDeleting={deleting}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Prompt Used:</h4>
                <p className="text-sm bg-muted p-3 rounded-lg italic">"{artwork.prompt_used || "No prompt available"}"</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Generated Artwork:</h4>
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
                <span>Created on {new Date(artwork.created_at).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
