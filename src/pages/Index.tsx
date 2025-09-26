import { useState } from 'react';
import { Camera, Sparkles, Palette, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CollectionManager } from '@/components/CollectionManager';
import { PhotoUpload } from '@/components/PhotoUpload';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ArtworkGallery } from '@/components/ArtworkGallery';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState<unknown>(null);
  const { toast } = useToast();

  // Simple auth demo - in a real app you'd have proper auth flow
  const signInDemo = async () => {
    toast({
      title: "Demo Mode",
      description: "This is a demo. In a real app, you'd implement proper authentication.",
    });
    setUser({ id: 'demo-user' });
  };

  const handlePhotoUploaded = () => {
    setRefreshTrigger(prev => prev + 1);
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
                <h1 className="text-xl font-bold">Travel Art Studio</h1>
                <p className="text-sm text-muted-foreground">Transform travel photos into AI artwork</p>
              </div>
            </div>
            {!user && (
              <Button onClick={signInDemo} className="bg-gradient-primary hover:opacity-90">
                <User className="mr-2 h-4 w-4" />
                Demo Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-6xl font-bold mb-7 bg-gradient-primary bg-clip-text text-transparent pb-3">
              Turn Your Travel Photos Into Stunning Art
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Upload your travel photos and let AI transform them into beautiful artwork descriptions using Ollama's Tinyllama model
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>Upload Photos</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>AI Generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Artistic Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Collections */}
          <div className="lg:col-span-1">
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <CollectionManager
                  selectedCollectionId={selectedCollectionId}
                  onSelectCollection={setSelectedCollectionId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedCollectionId ? (
              <Tabs defaultValue="photos" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="photos" className="flex items-center space-x-2">
                    <Camera className="h-4 w-4" />
                    <span>Photos</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="artworks" className="flex items-center space-x-2">
                    <Palette className="h-4 w-4" />
                    <span>Artworks</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="space-y-6">
                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Photo Gallery</h3>
                      <PhotoGallery
                        collectionId={selectedCollectionId}
                        refreshTrigger={refreshTrigger}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-6">
                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Upload New Photos</h3>
                      <PhotoUpload
                        collectionId={selectedCollectionId}
                        onPhotoUploaded={handlePhotoUploaded}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="artworks" className="space-y-6">
                  <Card className="shadow-soft">
                    <CardContent className="p-6">
                      <ArtworkGallery refreshTrigger={refreshTrigger} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="shadow-soft">
                <CardContent className="p-12 text-center">
                  <Palette className="mx-auto h-16 w-16 text-muted-foreground mb-6 animate-float" />
                  <h3 className="text-2xl font-bold mb-4">Welcome to Travel Art Studio</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Create your first photo collection to start transforming your travel memories into beautiful AI-generated artwork descriptions.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Select or create a collection from the sidebar to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
