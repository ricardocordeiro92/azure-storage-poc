import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as mime from 'mime-types';
import { UploadSuccessResponse } from 'src/azure-blob/dtos/uploadSuccessResponse';
import { AzureBlobService } from '../../services/azure-blob.service';

@Controller()
export class AzureBlobController {
  containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  constructor(private readonly azureBlobService: AzureBlobService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('myfile'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadSuccessResponse> {
    const uploadFile = await this.azureBlobService.uploadFile(
      file,
      this.containerName,
    );
    return uploadFile;
  }

  @Get('read-file')
  async readFile(@Res() res, @Query('filename') filename): Promise<void> {
    const file = await this.azureBlobService.getFile(
      filename,
      this.containerName,
    );

    return file.pipe(res);
  }

  @Delete('delete/:filename')
  async delete(@Param('filename') filename: string): Promise<string> {
    const deleteFile = await this.azureBlobService.deleteFile(
      filename,
      this.containerName,
    );
    return deleteFile;
  }

  @Get('download-file')
  async downloadFile(
    @Res() res,
    @Query('filename') filename: string,
  ): Promise<void> {
    const file = await this.azureBlobService.getFile(
      filename,
      this.containerName,
    );

    const fileExtension = filename.split('.').pop();

    const contentType = mime.lookup(fileExtension);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    return file.pipe(res);
  }
}
