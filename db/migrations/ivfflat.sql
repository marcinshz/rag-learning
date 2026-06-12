CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX ON cv_chunks 
  USING ivfflat (embedding vector_cosine_ops);