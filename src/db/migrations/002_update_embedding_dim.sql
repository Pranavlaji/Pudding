-- Drop the existing index as it depends on dimensions
DROP INDEX IF EXISTS pr_embeddings_embedding_idx;

-- Alter the column to 768 dimensions (Gemini text-embedding-004)
ALTER TABLE pr_embeddings ALTER COLUMN embedding TYPE vector(768);

-- Recreate the index (using IVFFlat for now, requiring some data to be effective)
CREATE INDEX pr_embeddings_embedding_idx ON pr_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
