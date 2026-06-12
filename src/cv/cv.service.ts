import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { PDFParse } from 'pdf-parse';
import OpenAI from "openai";
import { DataSource } from 'typeorm';
import { CvChunk } from './cvChunk.entity';

@Injectable()
export class CvService {
  private readonly openai: OpenAI;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async ingest(file: Express.Multer.File): Promise<void> {
    try {
      const rawText = await this.convertPdf(file);
      const chunks = this.splitTextIntoChunksByChars(rawText, 250);
      const cvId = randomUUID();
      await this.saveChunksToDatabase(cvId, chunks);
    } catch (error) {
      throw new Error(`Failed to ingest CV: ${error.message}`);
    }
  }

  async search(query: string): Promise<string> {
    try {
      const questionEmbedding = await this.createEmbeddings(query);
      const vector = `[${questionEmbedding.join(',')}]`;
  
      const rows = await this.dataSource.query(`
        SELECT id, cv_id, content, embedding
        FROM cv_chunks
        ORDER BY embedding <=> $1::vector
        LIMIT 2
      `, [vector]);

      return await this.answerQuestion(rows.map((row) => row.content), query);
    } catch (error) {
      throw new Error(`Failed to search CV: ${error.message}`);
    }
  }

  async answerQuestion(chunks: string[], query: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Answer questions based only on the provided context. If the answer is not in the context, say so explicitly." },
          { role: "user", content: `Context:\n${chunks.join("\n\n")}\n\nQuestion: ${query}` },
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

  async convertPdf(file: Express.Multer.File): Promise<string> {
    const pdfParser = new PDFParse({ data: file.buffer });
    try {
      const result = await pdfParser.getText();
      if (!result.text) {
        throw new Error('Failed to parse PDF');
      }
      return result.text;
    } finally {
      await pdfParser.destroy();
    }
  }

  // Simple chunking algorithm, just fixed chunk size. (Has issues, but works for now as basic starting point)
  splitTextIntoChunksByChars(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
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

  async getCvChunks(): Promise<CvChunk[]> {
    try {
      const repository = this.dataSource.getRepository(CvChunk);
      return repository.find({
        order: { cvId: 'ASC', id: 'ASC' },
      });
    } catch (error) {
      throw new Error(`Failed to get CV chunks: ${error.message}`);
    }
  }

  async getCvChunksById(cvId: string): Promise<CvChunk[]> {
    try {
      const repository = this.dataSource.getRepository(CvChunk);
      return repository.find({
        where: { cvId },
        order: { id: 'ASC' },
      });
    } catch (error) {
      throw new Error(`Failed to get CV chunks by ID: ${error.message}`);
    }
  }

  async saveChunksToDatabase(cvId: string, chunks: string[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const chunk of chunks) {
        const embedding = await this.createEmbeddings(chunk);
        await queryRunner.query(
          `INSERT INTO cv_chunks (cv_id, content, embedding) VALUES ($1, $2, $3::vector)`,
          [cvId, chunk, `[${embedding.join(',')}]`],
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
