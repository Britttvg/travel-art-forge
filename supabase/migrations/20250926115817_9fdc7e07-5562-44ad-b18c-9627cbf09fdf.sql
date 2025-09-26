-- Create storage buckets for travel photos and generated artworks
INSERT INTO storage.buckets (id, name, public) VALUES ('travel-photos', 'travel-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-artworks', 'generated-artworks', true);

-- Create table for user photo collections
CREATE TABLE public.photo_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for travel photos
CREATE TABLE public.travel_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.photo_collections(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for generated artworks
CREATE TABLE public.generated_artworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.photo_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  artwork_url TEXT NOT NULL,
  style_settings JSONB NOT NULL,
  prompt_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_favorite BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.photo_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_artworks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for photo_collections
CREATE POLICY "Users can view their own photo collections" 
ON public.photo_collections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own photo collections" 
ON public.photo_collections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photo collections" 
ON public.photo_collections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photo collections" 
ON public.photo_collections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for travel_photos
CREATE POLICY "Users can view photos in their collections" 
ON public.travel_photos 
FOR SELECT 
USING (collection_id IN (SELECT id FROM public.photo_collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can add photos to their collections" 
ON public.travel_photos 
FOR INSERT 
WITH CHECK (collection_id IN (SELECT id FROM public.photo_collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete photos from their collections" 
ON public.travel_photos 
FOR DELETE 
USING (collection_id IN (SELECT id FROM public.photo_collections WHERE user_id = auth.uid()));

-- Create RLS policies for generated_artworks
CREATE POLICY "Users can view their own generated artworks" 
ON public.generated_artworks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated artworks" 
ON public.generated_artworks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated artworks" 
ON public.generated_artworks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated artworks" 
ON public.generated_artworks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage policies for travel photos
CREATE POLICY "Users can upload their own travel photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own travel photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own travel photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for generated artworks (public read)
CREATE POLICY "Anyone can view generated artworks" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-artworks');

CREATE POLICY "Users can upload their own generated artworks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-artworks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_photo_collections_updated_at
BEFORE UPDATE ON public.photo_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();