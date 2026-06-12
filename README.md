# cv-rag

A learning project exploring AI Engineering through a practical use case: searching and querying CVs using Retrieval-Augmented Generation (RAG).

## What it does

Upload a PDF CV, ask questions in natural language, get answers grounded in the document.

```
POST /cv/ingest     → upload a PDF, chunk it, embed it, store in vector DB
POST /search/ask    → ask a question, get an answer backed by relevant CV fragments
```

Under the hood: the CV is split into chunks, each chunk is converted to a vector embedding via OpenAI, and stored in PostgreSQL with pgvector. On search, the question is embedded with the same model, the closest chunks are retrieved by cosine similarity, and passed as context to GPT-4o-mini.

## Stack

- **NestJS** — API
- **PostgreSQL + pgvector** — vector storage and similarity search
- **OpenAI** — `text-embedding-3-small` for embeddings, `gpt-4o-mini` for answers
- **pdf-parse** — PDF to raw text
- **Docker Compose** — local development

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/your-username/cv-rag
cd cv-rag
npm install

# 2. Set up environment
echo "OPENAI_API_KEY=sk-..." > .env

# 3. Start Postgres with pgvector
docker-compose up -d postgres

# 4. Run migrations
docker exec -it postgres psql -U postgres -d cvrag -c "
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE TABLE cv_chunks (
    id SERIAL PRIMARY KEY,
    cv_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB
  );
  CREATE INDEX ON cv_chunks USING ivfflat (embedding vector_cosine_ops);
"

# 5. Start the API
npm run start:dev
```

## Usage

```bash
# Upload a CV
curl -X POST localhost:3000/cv/ingest \
  -F "file=@/path/to/cv.pdf"

# Ask a question
curl -X POST localhost:3000/search/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Does this candidate have React experience?"}'
```

## How RAG works here

```
PDF
 └─ raw text
     └─ chunks (250 chars each)
         └─ embeddings (1536-dimensional vectors)
             └─ pgvector storage

Question
 └─ embedding (same model)
     └─ cosine similarity search → top 2 chunks
         └─ GPT-4o-mini with context → answer
```

The key insight: instead of sending the entire CV to the model on every query, only the semantically relevant fragments are retrieved. Cheaper, faster, and scales to many documents.

## Roadmap

- [x] Single CV ingestion and search
- [ ] Multi-CV support with candidate filtering
- [ ] Semantic chunking and parent-child chunking strategies
