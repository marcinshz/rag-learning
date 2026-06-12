import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvModule } from './cv/cv.module';
import { CvChunk } from './cv/cvChunk.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [CvChunk],
      synchronize: true,
    }),
    CvModule,
  ],
})
export class AppModule {}
