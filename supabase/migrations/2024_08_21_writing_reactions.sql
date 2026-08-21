-- Create writing_reactions table for anonymous reactions
-- Users can react to writings without authentication

CREATE TABLE writing_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  writing_id uuid NOT NULL REFERENCES public_writings(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'clap', 'mind_blown', 'relate')),
  -- For anonymous users, we track a session fingerprint (not IP)
  -- This is a simple hash of user agent + viewport + timezone for deduplication
  session_fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate reactions from same session
CREATE UNIQUE INDEX idx_writing_reactions_unique
  ON writing_reactions(writing_id, session_fingerprint, reaction_type);

-- Create index for querying reactions
CREATE INDEX idx_writing_reactions_writing_id
  ON writing_reactions(writing_id);

-- Enable RLS
ALTER TABLE writing_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reactions
CREATE POLICY "Reactions are viewable by everyone" ON writing_reactions
  FOR SELECT USING (true);

-- Policy: Anyone can insert reactions
CREATE POLICY "Anyone can add reactions" ON writing_reactions
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their own reactions (by session fingerprint)
CREATE POLICY "Users can remove their own reactions" ON writing_reactions
  FOR DELETE USING (session_fingerprint = current_setting('request.jwt.claims.session_fingerprint', true));

-- Grant permissions
GRANT ALL ON writing_reactions TO authenticated;
GRANT ALL ON writing_reactions TO anon;
GRANT ALL ON writing_reactions_id_seq TO authenticated;
GRANT ALL ON writing_reactions_id_seq TO anon;

-- Add reaction count view to public_writings for efficient popular sorting
-- We'll use a materialized view or just compute on the fly
-- For now, add a trigger to maintain counts (or we can compute on query)

-- Alternative: Add reaction counts as a computed view
CREATE VIEW public_writings_with_reactions AS
SELECT
  pw.*,
  COALESCE(SUM(CASE WHEN wr.reaction_type = 'heart' THEN 1 ELSE 0 END), 0) as heart_count,
  COALESCE(SUM(CASE WHEN wr.reaction_type = 'clap' THEN 1 ELSE 0 END), 0) as clap_count,
  COALESCE(SUM(CASE WHEN wr.reaction_type = 'mind_blown' THEN 1 ELSE 0 END), 0) as mind_blown_count,
  COALESCE(SUM(CASE WHEN wr.reaction_type = 'relate' THEN 1 ELSE 0 END), 0) as relate_count,
  COALESCE(COUNT(wr.id), 0) as total_reactions
FROM public_writings pw
LEFT JOIN writing_reactions wr ON pw.id = wr.writing_id
GROUP BY pw.id;