import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import pdf2md from '@opendocsg/pdf2md';
import OpenAI from 'openai';
import { DocumentChunk } from './documentChunk.entity';

@Injectable()
export class DocumentService {
    private static readonly DEFAULT_CHUNK_LIMIT = 5;

    private readonly openai: OpenAI;

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
      }
    
    async ingest(file: Express.Multer.File): Promise<void> {
        try {
            const markdown = await this.pdfToMarkdown(file);
            const chunks = this.chunkMarkdownByH2(markdown);
            console.log(markdown);
            const documentId = randomUUID();
            await this.saveChunksToDatabase(documentId, chunks);
        } catch (error) {
            throw new Error(`Failed to ingest document: ${error.message}`);
        }
    }

    async searchInSingleDocument(
        documentId: string,
        query: string,
        chunkLimit = DocumentService.DEFAULT_CHUNK_LIMIT,
    ): Promise<string> {
        try {
          const totalChunks = await this.countChunksByDocumentId(documentId);
          if (totalChunks === 0) {
            throw new Error('Document not found or has no chunks');
          }

          const limit = Math.min(
            Math.max(1, chunkLimit),
            totalChunks,
          );

          const questionEmbedding = await this.createEmbeddings(query);
          const vector = `[${questionEmbedding.join(',')}]`;
          const rows = await this.dataSource.query(`
            SELECT id, document_id, content, embedding, metadata
            FROM document_chunks
            WHERE document_id = $1
            ORDER BY embedding <=> $2::vector
            LIMIT $3
          `, [documentId, vector, limit]);
    
          return await this.answerQuestion(rows.map((row) => ({content: row.content, metadata: row.metadata})), query);
        } catch (error) {
          throw new Error(`Failed to search Document: ${error.message}`);
        }
      }

    async answerQuestion(chunks: {content: string, metadata: Record<string, unknown>}[], query: string): Promise<string> {
        try {
          const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Answer questions based only on the provided context. If the answer is not in the context, say so explicitly." },
              { role: "user", content: JSON.stringify(chunks) + "\n\nQuestion: " + query},
            ]
          });
          if( !response.choices[0].message.content ) {
            throw new Error('Failed to answer question');
          }
          return response.choices[0].message.content;
        } catch (error) {
          throw new Error(`Failed to answer question: ${error.message}`);
        }
      }

    async pdfToMarkdown(file: Express.Multer.File): Promise<string> {
        try{
            const markdown = await pdf2md(file.buffer);
            return markdown;
        } catch (error) {
            throw new Error(`Failed to convert PDF to Markdown: ${error.message}`);
        }
    }

    chunkMarkdownByH2(markdown): Array<{ title: string | '', content: string }> {
        const sections = markdown.split(/^## /m);
        const preamble = sections[0].trim();
        const chunks = preamble
          ? [{ title: 'Beginning of the document', content: preamble }]
          : [];
        for (let i = 1; i < sections.length; i++) {
          const [titleLine, ...bodyLines] = sections[i].split('\n');
          chunks.push({
            title: titleLine.trim(),
            content: bodyLines.join('\n').trim(),
          });
        }
        return chunks;
    }

    async createEmbeddings(text: string): Promise<number[]> {
        try {
          const response = await this.openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
            encoding_format: "float",
            dimensions: 1536,
          });
          return response.data[0].embedding;
        } catch (error) {
          throw new Error(`Failed to create embeddings: ${error.message}`);
        }
    }

    async getDocumentChunks(): Promise<DocumentChunk[]> {
        try {
            const repository = this.dataSource.getRepository(DocumentChunk);
            return repository.find({
                order: { documentId: 'ASC', id: 'ASC' },
            });
        } catch (error) {
            throw new Error(`Failed to get document chunks: ${error.message}`);
        }
    }

    async countChunksByDocumentId(documentId: string): Promise<number> {
        try {
            const repository = this.dataSource.getRepository(DocumentChunk);
            return repository.count({ where: { documentId } });
        } catch (error) {
            throw new Error(`Failed to count document chunks: ${error.message}`);
        }
    }

    async saveChunksToDatabase(
        documentId: string,
        chunks: Array<{ title: string | ''; content: string }>,
    ): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const chunk of chunks) {
                const text = chunk.title + '\n\n' + chunk.content;
                const embedding = await this.createEmbeddings(text);
                await queryRunner.query(
                    `INSERT INTO document_chunks (document_id, content, embedding, metadata) VALUES ($1, $2, $3::vector, $4)`,
                    [documentId, text, `[${embedding.join(',')}]`, { title: chunk.title }],
                );
            }
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw new Error(`Failed to save chunks: ${error.message}`);
        } finally {
            await queryRunner.release();
        }
    }
}
