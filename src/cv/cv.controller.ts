import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CvService } from './cv.service';

@ApiTags('cv')
@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a CV document' })
  ingest(): void {
    this.cvService.ingest();
  }
}
