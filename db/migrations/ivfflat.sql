CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE cv_chunks
(
  id SERIAL PRIMARY KEY,
  cv_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB
);

CREATE TABLE document_chunks
(
  id SERIAL PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB
);

CREATE INDEX ON cv_chunks 
  USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops);