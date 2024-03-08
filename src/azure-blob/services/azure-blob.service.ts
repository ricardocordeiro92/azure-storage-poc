import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { BadRequestException, Injectable } from '@nestjs/common';
import { uuid } from 'uuidv4';
import { UploadSuccessResponse } from '../dtos/uploadSuccessResponse';

@Injectable()
export class AzureBlobService {
  readonly azureConnection = process.env.AZURE_STORAGE_CONNECTION;

  async getBlobClient(
    containerName: string,
    imageName: string,
  ): Promise<BlockBlobClient> {
    try {
      const blobClientService = BlobServiceClient.fromConnectionString(
        this.azureConnection,
      );
      const containerClient =
        blobClientService.getContainerClient(containerName);

      if (!(await containerClient.exists())) {
        await containerClient.create();
      }

      const blobClient = containerClient.getBlockBlobClient(imageName);

      return blobClient;
    } catch (error) {
      throw new BadRequestException(
        `Error getting blob client: ${error.message}.`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    containerName: string,
  ): Promise<UploadSuccessResponse> {
    const fileName = uuid() + '_' + file.originalname;

    try {
      const blobClient = await this.getBlobClient(containerName, fileName);

      await blobClient.uploadData(file.buffer);

      return {
        message: 'File uploaded successfully',
        fileName: fileName,
        containerName: containerName,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getFile(
    fileName: string,
    containerName: string,
  ): Promise<NodeJS.ReadableStream> {
    try {
      const blobClient = await this.getBlobClient(containerName, fileName);
      const blobDownloaded = await blobClient.download();

      return blobDownloaded.readableStreamBody;
    } catch (error) {
      throw new BadRequestException(
        `Failed to get file ${fileName}: ${error.message}.`,
      );
    }
  }

  async deleteFile(filename: string, containerName: string): Promise<string> {
    try {
      const blobClient = await this.getBlobClient(containerName, filename);
      const result = await blobClient.deleteIfExists();

      if (result.succeeded) {
        return `File ${filename} deleted successfully.`;
      } else {
        throw new BadRequestException(`Failed to delete file ${filename}.`);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file ${filename}: ${error.message}.`,
      );
    }
  }
}
