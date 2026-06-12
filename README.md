# cv-rag

A learning project exploring AI Engineering through a practical use case: searching and querying CVs using Retrieval-Augmented Generation (RAG).

## What it does

Upload a PDF CV, ask questions in natural language, get answers grounded in the document.

```
POST /cv/ingest     → upload a PDF, chunk it, embed it, store in vector DB
POST /search/ask    → ask a question, get an answer backed by relevant CV fragments
```

Under the hood: the CV is split into chunks, each chunk is converted to a vector embedding via OpenAI, and stored in PostgreSQL with pgvector. On search, the question is embedded with the same model, the closest chunks are retrieved by cosine similarity, and passed as context — together with candidate metadata — to GPT-4o-mini.

## Stack

- **NestJS** — API
- **PostgreSQL + pgvector** — vector storage and similarity search
- **OpenAI** — `text-embedding-3-small` for embeddings, `gpt-4o-mini` for answers and metadata extraction
- **pdf-parse** — PDF to raw text
- **Docker Compose** — local development

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/your-username/cv-rag
cd cv-rag

# 2. Set up environment
echo "OPENAI_API_KEY=sk-..." > .env

# 3. Docker compose up
docker compose up --build
```

## 4. Try it out — Swagger UI

```
http://localhost:3000/api/docs
```

## How RAG works here

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
     └─ cosine similarity search → top 2 chunks
         └─ chunk content + candidate metadata
             └─ GPT-4o-mini → answer
```

The key insight: instead of sending the entire CV to the model on every query, only the semantically relevant fragments are retrieved. Cheaper, faster, and scales to many documents.

Metadata is extracted once at ingestion time using a structured OpenAI call (`response_format: json_object`). It travels with every chunk, so the model always knows who the candidate is — even when the matched fragment doesn't mention their name.

## Roadmap

- [x] Single CV ingestion and search
- [x] Metadata extraction — name, city, position, education, years of experience
- [x] Multi-CV support with candidate filtering by metadata