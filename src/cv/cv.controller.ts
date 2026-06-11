import { Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CvService } from './cv.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('cv')
@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a CV document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'file'},
      },
    },
    required: true,
  })
  @UseInterceptors(FileInterceptor('file'))
  ingest(@UploadedFile() file: Express.Multer.File): void {
    this.cvService.ingest(file);
  }

  @Get('chunks')
  @ApiOperation({ summary: 'Get all CV chunks' })
  getCvChunks() {
    return this.cvService.getCvChunks();
  }

  @Get('chunks/:cvId')
  @ApiOperation({ summary: 'Get CV chunks by CV ID' })
  @ApiParam({ name: 'cvId', description: 'CV ID' })
  getCvChunksById(@Param('cvId') cvId: string) {
    return this.cvService.getCvChunksById(cvId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search CV documents' })
  search( @Query('query') query: string): Promise<string> {
    return this.cvService.search(query);
  }
}
