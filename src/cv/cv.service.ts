import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PDFParse } from 'pdf-parse';
import OpenAI from "openai";
import { DataSource } from 'typeorm';
import { CvChunk } from './cvChunk.entity';

@Injectable()
export class CvService {
  private readonly openai: OpenAI;
  private readonly dataSource: DataSource;
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.dataSource = new DataSource({
      type: "postgres",
      url: process.env.DATABASE_URL,
      entities: [CvChunk],
      synchronize: true,
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
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }

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
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }

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
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const chunk of chunks) {
        const embedding = await this.createEmbeddings(chunk);
        console.log(embedding);
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
