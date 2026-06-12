import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cv_chunks')
export class CvChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cv_id', type: 'uuid' })
  cvId: string;

  @Column('text')
  content: string;

  @Column('vector', { length: 1536, nullable: true })
  embedding: number[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;
}
