import { useState, useEffect } from "react";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../components/LanguageProvider";
import { Camera, Sparkles, Palette, User as UserIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CollectionManager } from "@/components/CollectionManager";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ArtworkGallery } from "@/components/ArtworkGallery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

const Index = () => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("photos");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      setSession(session);
      setUser(session?.user ?? null);

      // Clear collections and reset state when user logs out
      if (event === "SIGNED_OUT" || !session) {
        setSelectedCollectionId(null);
        setRefreshTrigger((prev) => prev + 1);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Sign in error:", error);
      setError(error.message);
    } else {
      console.log("Sign in success:", data);
      toast({
        title: t("auth.loggedIn"),
        description: t("auth.loggedInDesc"),
      });
      // Refresh content after successful login
      setRefreshTrigger((prev) => prev + 1);
      setSelectedCollectionId(null);
      // Don't manually set user/session - the auth state listener will handle it
    }
    setLoading(false);
  };

  // NOT USED YET
  const signUp = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handlePhotoUploaded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCollectionSelected = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setActiveTab("photos"); // Set photos as default tab when selecting a collection
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("app.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{t("auth.welcome").replace("{email}", user.email!)}</span>
                  <Button onClick={() => supabase.auth.signOut()} variant="outline" size="sm">
                    {t("auth.signOut")}
                  </Button>
                </div>
              ) : (
                <>
                  <Input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="w-40" />
                  <Input type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className="w-40" />
                  <Button onClick={signIn} disabled={loading} className="bg-gradient-primary hover:opacity-90">
                    <UserIcon className="mr-2 h-4 w-4" />
                    {t("auth.signIn")}
                  </Button>
                </>
              )}
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              {/* Language and Theme toggles in header */}
              <div className="ml-4 flex gap-2">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-6xl font-bold mb-7 bg-gradient-primary bg-clip-text text-transparent pb-3">{t("hero.title")}</h2>
            <p className="text-xl text-muted-foreground mb-8">{t("hero.subtitle")}</p>
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>{t("hero.upload")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>{t("hero.generation")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>{t("hero.results")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        {user ? (
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar - Collections */}
            <div className="lg:col-span-1">
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <CollectionManager selectedCollectionId={selectedCollectionId} onSelectCollection={handleCollectionSelected} />
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {selectedCollectionId ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upload">{t("tabs.upload")}</TabsTrigger>
                    <TabsTrigger value="photos">{t("tabs.photos")}</TabsTrigger>
                    <TabsTrigger value="artworks">{t("tabs.artworks")}</TabsTrigger>
                  </TabsList>{" "}
                  <TabsContent value="upload" className="space-y-6">
                    <Card className="shadow-soft">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">{t("photos.upload.title")}</h3>
                        <PhotoUpload collectionId={selectedCollectionId} onPhotoUploaded={handlePhotoUploaded} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="photos" className="space-y-6">
                    <Card className="shadow-soft">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">{t("photos.title")}</h3>
                        <PhotoGallery collectionId={selectedCollectionId} refreshTrigger={refreshTrigger} onArtworkGenerated={() => setActiveTab("artworks")} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="artworks" className="space-y-6">
                    <Card className="shadow-soft">
                      <CardContent className="p-6">
                        <ArtworkGallery collectionId={selectedCollectionId} refreshTrigger={refreshTrigger} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card className="shadow-soft">
                  <CardContent className="p-12 text-center">
                    <Palette className="mx-auto h-16 w-16 text-muted-foreground mb-6 animate-float" />
                    <h3 className="text-2xl font-bold mb-4">{t("welcome.title")}</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("welcome.subtitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("welcome.getStarted")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="shadow-soft max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <Palette className="mx-auto h-16 w-16 text-muted-foreground mb-6 animate-float" />
              <h3 className="text-2xl font-bold mb-4">{t("welcome.title")}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("welcome.subtitle")}</p>
              <p className="text-sm text-muted-foreground">{t("auth.signInToStart")}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
