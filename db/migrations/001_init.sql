CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE cv_chunks (
  id        SERIAL PRIMARY KEY,
  cv_id     VARCHAR(255) NOT NULL,      -- eg. name
  content   TEXT NOT NULL,              -- raw chunk text
  embedding vector(1536),               -- vector from OpenAI
  metadata  JSONB                       -- personal data
);

CREATE INDEX ON cv_chunks 
  USING ivfflat (embedding vector_cosine_ops);