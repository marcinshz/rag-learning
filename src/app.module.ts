import { Module } from '@nestjs/common';
import { CvModule } from './cv/cv.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [CvModule, SearchModule],
})
export class AppModule {}
