import { useState, useEffect } from "react";
import { Plus, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/LanguageProvider";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  photo_count?: number;
}

interface CollectionManagerProps {
  selectedCollectionId: string | null;
  onSelectCollection: (id: string) => void;
}

export function CollectionManager({ selectedCollectionId, onSelectCollection }: Readonly<CollectionManagerProps>) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1400);
  const { toast } = useToast();
  const { t } = useLanguage();
  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1400);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCollections = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("photo_collections")
        .select(
          `
          *,
          travel_photos(count)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const collectionsWithCounts =
        data?.map((collection) => ({
          ...collection,
          photo_count: collection.travel_photos?.[0]?.count || 0,
        })) || [];

      setCollections(collectionsWithCounts);

      // Auto-select first collection if none selected
      if (!selectedCollectionId && collectionsWithCounts.length > 0) {
        onSelectCollection(collectionsWithCounts[0].id);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast({
        title: t("collections.errors.loadFailed"),
        description: t("common.refreshPage"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (collectionId: string, collectionName: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("photo_collections").delete().eq("id", collectionId);
      if (error) throw error;

      toast({
        title: t("collections.deleted"),
        description: `"${collectionName}" ${t("collections.deletedSuccessfully")}`,
      });

      // If the deleted collection was selected, clear selection
      if (selectedCollectionId === collectionId) {
        onSelectCollection("");
      }

      // Refresh collections list
      fetchCollections();
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast({
        title: t("collections.errors.deleteFailed"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const createCollection = async () => {
    if (!newCollection.name.trim()) {
      toast({
        title: t("collections.errors.nameRequired"),
        description: t("collections.errors.enterName"),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t("auth.required"),
          description: t("auth.signInToCreateCollections"),
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("photo_collections")
        .insert({
          user_id: user.id,
          name: newCollection.name.trim(),
          description: newCollection.description.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t("collections.created"),
        description: `"${newCollection.name}" ${t("collections.createdSuccessfully")}`,
      });

      setNewCollection({ name: "", description: "" });
      setCreateDialogOpen(false);
      fetchCollections();

      // Auto-select the new collection
      if (data) {
        onSelectCollection(data.id);
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({
        title: t("collections.errors.createFailed"),
        description: t("common.tryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("collections.photoCollections")}</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size={isLargeScreen ? "sm" : "icon"} className={`bg-gradient-primary hover:opacity-90 items-center${isLargeScreen ? "" : " justify-center"}`} aria-label={t("collections.newCollection")}>
              <Plus className={isLargeScreen ? "mr-2 h-4 w-4" : "h-5 w-5"} />
              {isLargeScreen && t("collections.newCollection")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("collections.createNew")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("collections.collectionName")}</Label>
                <Input id="name" placeholder={t("collections.namePlaceholder")} value={newCollection.name} onChange={(e) => setNewCollection((prev) => ({ ...prev, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="description">{t("collections.descriptionOptional")}</Label>
                <Textarea id="description" placeholder={t("collections.descriptionPlaceholder")} value={newCollection.description} onChange={(e) => setNewCollection((prev) => ({ ...prev, description: e.target.value }))} className="mt-1" rows={3} />
              </div>
              <Button onClick={createCollection} disabled={creating || !newCollection.name.trim()} className="w-full bg-gradient-primary hover:opacity-90">
                {creating ? t("collections.creating") : t("collections.createCollection")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("collections.noCollections")}</h3>
            <p className="text-muted-foreground mb-4">{t("collections.createFirstCollection")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {collections.map((collection) => (
            <Card key={collection.id} className={`cursor-pointer transition-all duration-200 hover:shadow-elegant ${selectedCollectionId === collection.id ? "ring-2 ring-primary shadow-elegant" : "hover:border-primary/50"}`} onClick={() => onSelectCollection(collection.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{collection.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {collection.photo_count || 0} {t(collection.photo_count === 1 ? "photos.photo" : "photos.photos")}
                    </Badge>
                    <ConfirmDeleteDialog
                      trigger={
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-destructive/20 dark:hover:bg-destructive/30 hover:scale-110 transition-all duration-200" onClick={(e) => e.stopPropagation()} aria-label={t("collections.delete")}>
                          <Trash2 className="h-4 w-4 text-destructive hover:text-destructive-foreground" />
                        </Button>
                      }
                      title={t("collections.deleteConfirmTitle")}
                      description={`${t("collections.deleteConfirmDescription")} "${collection.name}"? ${t("common.undoWarning")}`}
                      onConfirm={() => deleteCollection(collection.id, collection.name)}
                      isDeleting={deleting}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {collection.description && <p className="text-sm text-muted-foreground mb-2">{collection.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {t("collections.created")} {new Date(collection.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
