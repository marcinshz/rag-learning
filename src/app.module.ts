import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvModule } from './cv/cv.module';
import { CvChunk } from './cv/cvChunk.entity';
import { DocumentChunk } from './document/documentChunk.entity';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [CvChunk, DocumentChunk],
      synchronize: true,
    }),
    CvModule,
    DocumentModule,
  ],
})
export class AppModule {}
