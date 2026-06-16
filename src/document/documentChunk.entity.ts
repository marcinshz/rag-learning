import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column('text')
  content: string;

  @Column('vector', { length: 1536, nullable: true })
  embedding: number[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;
}
