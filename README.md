# RAG Lab

A playground for experimenting with different Retrieval-Augmented Generation (RAG) approaches. Each module is a self-contained use case with its own ingestion pipeline, retrieval strategy, and answer generation — sharing the same NestJS + PostgreSQL/pgvector foundation.

The CV module was the starting point; the Document module follows as a second experiment — comparing fixed-size character chunking vs structure-aware Markdown section chunking. More modules may follow as different RAG patterns are explored (metadata, hybrid search, re-ranking, etc.).

## Architecture

```
src/
├── app.module.ts          # shared DB + module wiring
├── cv/                    # module: CV search over PDFs
│   ├── cv.module.ts
│   ├── cv.controller.ts
│   ├── cv.service.ts
│   └── cvChunk.entity.ts
└── document/              # module: structured document search
    ├── document.module.ts
    ├── document.controller.ts
    ├── document.service.ts
    └── documentChunk.entity.ts
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

### Document (`/document`)

Search and query PDF documents using structure-aware chunking — an alternative to the CV module's fixed-size character chunks.

| Endpoint | Description |
|----------|-------------|
| `POST /document/ingest` | Upload a PDF — convert to Markdown, chunk by section, embed, store |
| `GET /document/chunks` | List all stored chunks |
| `GET /document/chunks/:documentId/count` | Count chunks for a specific document |
| `GET /document/search/:documentId?query=...&limit=N` | Ask a question scoped to one document; optional `limit` sets how many chunks to retrieve (default: 5) |

**Ingestion:** PDF → Markdown (`@opendocsg/pdf2md`) → H2-section chunks (preamble + each `##` heading) → embeddings (`text-embedding-3-small`, 1536 dims) → pgvector storage with section title in JSONB metadata.

**Retrieval:** embed the question → cosine similarity search within the given `documentId` → pass the top-N chunks to GPT-4o-mini for the answer. Use the optional `limit` query param to control how many chunks are retrieved (default 5, clamped between 1 and the document's total chunk count).

```
PDF
 └─ Markdown (@opendocsg/pdf2md)
     └─ chunks by H2 sections
         ├─ preamble ("Beginning of the document")
         └─ each ## heading → title + body
             └─ metadata: { title }
                 └─ embeddings (1536-dimensional vectors)
                     └─ pgvector storage (document_chunks table)

Question + documentId + limit (optional)
 └─ embedding (same model)
     └─ cosine similarity search (scoped to document) → top-N chunks
         └─ chunk content
             └─ GPT-4o-mini → answer
```

## Stack

- **NestJS** — API, modular structure
- **PostgreSQL + pgvector** — vector storage and similarity search
- **OpenAI** — `text-embedding-3-small` for embeddings, `gpt-4o-mini` for answers and metadata extraction
- **pdf-parse** — PDF to raw text (CV module)
- **@opendocsg/pdf2md** — PDF to Markdown (Document module)
- **Docker Compose** — local development

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/marcinshz/rag-learning
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

**Document module**
- [x] Single document ingestion with Markdown conversion
- [x] H2-section chunking (structure-aware, vs fixed-size in CV)
- [x] Per-document scoped search
- [x] Configurable chunk limit on search (`?limit=N`)
- [ ] Chunking improvements (parent-child chunking, nested headings)

**New modules & shared experiments**
- TBD
