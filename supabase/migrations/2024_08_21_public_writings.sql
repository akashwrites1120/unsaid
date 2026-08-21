-- Create public_writings table for anonymous published writings
-- This table stores only the content and metadata, no identifying information

CREATE TABLE public_writings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  word_count integer NOT NULL,
  category text NOT NULL CHECK (category IN ('thoughts', 'stories', 'journal', 'academic', 'confession', 'ideas', 'other')),
  challenge_mode text NOT NULL CHECK (challenge_mode IN ('soft', 'focus', 'hard')),
  challenge_duration integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_public_writings_created_at ON public_writings(created_at DESC);
CREATE INDEX idx_public_writings_category ON public_writings(category);
CREATE INDEX idx_public_writings_challenge_mode ON public_writings(challenge_mode);

-- Enable RLS (Row Level Security) for public writings
-- Since this is anonymous content, we'll allow public read access
ALTER TABLE public_writings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public writings are viewable by everyone" ON public_writings
  FOR SELECT USING (true);

-- Create policy for insert (publish) - anyone can publish anonymously
CREATE POLICY "Anyone can publish writings" ON public_writings
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public_writings TO authenticated;
GRANT ALL ON public_writings TO anon;
GRANT ALL ON public_writings_id_seq TO authenticated;
GRANT ALL ON public_writings_id_seq TO anon;