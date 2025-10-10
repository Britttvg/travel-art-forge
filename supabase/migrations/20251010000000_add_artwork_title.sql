-- Add title column to generated_artworks table
ALTER TABLE public.generated_artworks 
ADD COLUMN title TEXT;