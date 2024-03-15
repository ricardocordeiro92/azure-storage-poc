import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as mime from 'mime-types';
import { SuccessResponse } from 'src/azure-blob/dtos/successResponse';
import { AzureBlobService } from '../../services/azure-blob.service';

@Controller()
export class AzureBlobController {
  containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  constructor(private readonly azureBlobService: AzureBlobService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('myfile'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SuccessResponse> {
    const uploadFile = await this.azureBlobService.uploadFile(
      file,
      this.containerName,
    );

    return uploadFile;
  }

  @Get('read-file')
  async readFile(@Res() res, @Query('fileName') fileName): Promise<void> {
    const file = await this.azureBlobService.getFile(
      fileName,
      this.containerName,
    );

    return file.pipe(res);
  }

  @Delete('delete')
  async delete(@Query('fileName') fileName: string): Promise<string> {
    const deleteFile = await this.azureBlobService.deleteFile(
      fileName,
      this.containerName,
    );

    return deleteFile;
  }

  @Get('download-file')
  async downloadFile(
    @Res() res,
    @Query('fileName') fileName: string,
  ): Promise<void> {
    const file = await this.azureBlobService.getFile(
      fileName,
      this.containerName,
    );

    const fileExtension = fileName.split('.').pop();

    const contentType = mime.lookup(fileExtension);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; fileName=${fileName}`);

    return file.pipe(res);
  }

  @Get('listAll')
  async listFiles(): Promise<SuccessResponse[]> {
    return await this.azureBlobService.listFiles(this.containerName);
  }
}
