import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@ApiTags('document')
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a document' })
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
    this.documentService.ingest(file);
  }

  @Get('chunks')
  @ApiOperation({ summary: 'Get all document chunks' })
  getDocumentChunks() {
    return this.documentService.getDocumentChunks();
  }

  @Get('chunks/:documentId/count')
  @ApiOperation({ summary: 'Count document chunks by document ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  countChunksByDocumentId(@Param('documentId') documentId: string) {
    return this.documentService.countChunksByDocumentId(documentId);
  }

  @Get('search/:documentId')
  @ApiOperation({ summary: 'Search a document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of chunks to retrieve from vector search (default: 5)' })
  search(
    @Param('documentId') documentId: string,
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<string> {
    return this.documentService.searchInSingleDocument(documentId, query, limit);
  }
}
