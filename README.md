# RAG Lab

A playground for experimenting with different Retrieval-Augmented Generation (RAG) approaches. Each module is a self-contained use case with its own ingestion pipeline, retrieval strategy, and answer generation — sharing the same NestJS + PostgreSQL/pgvector foundation.

The CV module was the starting point; more modules will follow as different RAG patterns are explored (chunking, metadata, hybrid search, re-ranking, etc.).

## Architecture

```
src/
├── app.module.ts          # shared DB + module wiring
└── cv/                    # module: CV search over PDFs
    ├── cv.module.ts
    ├── cv.controller.ts
    ├── cv.service.ts
    └── cvChunk.entity.ts
```

Each module owns its routes, entities, and RAG logic. Shared infrastructure (Postgres, pgvector, OpenAI) lives at the app level.

## Modules

### CV (`/cv`)

Search and query PDF CVs using a basic vector RAG pipeline.

| Endpoint | Description |
|----------|-------------|
| `POST /cv/ingest` | Upload a PDF — chunk, embed, store |
| `POST /cv/ingest/batch` | Upload multiple PDFs |
| `GET /cv/search?query=...` | Ask a question, get an answer from relevant chunks |
| `GET /cv/chunks` | List all stored chunks |
| `GET /cv/chunks/:cvId` | List chunks for a specific CV |

**Ingestion:** PDF → raw text → metadata extraction (GPT-4o-mini) → fixed-size character chunks (250 chars) → embeddings (`text-embedding-3-small`, 1536 dims) → pgvector storage with JSONB metadata on every chunk.

**Retrieval:** embed the question → cosine similarity search → pass top chunks + candidate metadata to GPT-4o-mini for the answer.

```
PDF
 └─ raw text
     ├─ metadata extraction (GPT-4o-mini)
     │   └─ name, city, position, education, years of experience
     │       └─ stored as JSONB on every chunk
     └─ chunks (250 chars each)
         └─ embeddings (1536-dimensional vectors)
             └─ pgvector storage (with metadata attached)

Question
 └─ embedding (same model)
     └─ cosine similarity search → top-N chunks
         └─ chunk content + candidate metadata
             └─ GPT-4o-mini → answer
```

## Stack

- **NestJS** — API, modular structure
- **PostgreSQL + pgvector** — vector storage and similarity search
- **OpenAI** — `text-embedding-3-small` for embeddings, `gpt-4o-mini` for answers and metadata extraction
- **pdf-parse** — PDF to raw text (CV module)
- **Docker Compose** — local development

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/your-username/cv-rag
cd cv-rag
pnpm install

# 2. Set up environment
echo "OPENAI_API_KEY=sk-..." > .env

# 3. Start services
docker compose up --build
```

Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Roadmap

**CV module**
- [x] Single CV ingestion and search
- [x] Metadata extraction — name, city, position, education, years of experience
- [x] Multi-CV support
- [ ] Metadata-based pre-filtering before vector search

**New modules & shared experiments**
- TBD
