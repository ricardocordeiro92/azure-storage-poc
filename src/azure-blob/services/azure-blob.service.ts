import {
  BlobSASPermissions,
  BlobServiceClient,
  BlockBlobClient,
} from '@azure/storage-blob';
import { BadRequestException, Injectable } from '@nestjs/common';
import { uuid } from 'uuidv4';
import { SuccessResponse } from '../dtos/successResponse';

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

      if (blobClient) {
        return blobClient;
      } else {
        throw new BadRequestException(
          `Blob client is undefined for container: ${containerName} and image: ${imageName}.`,
        );
      }
    } catch (error) {
      throw new BadRequestException(
        `Error getting blob client: ${error.message}.`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    containerName: string,
  ): Promise<SuccessResponse> {
    const fileName = uuid() + file.originalname;

    try {
      const blobClient = await this.getBlobClient(containerName, fileName);

      await blobClient.uploadData(file.buffer);
      const temporaryUrl = await this.generateTemporaryUrl(
        fileName,
        containerName,
      );

      return {
        message: 'File uploaded successfully',
        fileName: fileName,
        containerName: containerName,
        url: temporaryUrl,
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

  async deleteFile(fileName: string, containerName: string): Promise<string> {
    try {
      const blobClient = await this.getBlobClient(containerName, fileName);
      const result = await blobClient.deleteIfExists();

      if (result.succeeded) {
        return `File ${fileName} deleted successfully.`;
      } else {
        throw new BadRequestException(`Failed to delete file ${fileName}.`);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file ${fileName}: ${error.message}.`,
      );
    }
  }

  async generateTemporaryUrl(
    fileName: string,
    containerName: string,
  ): Promise<string> {
    try {
      const blobClient = await this.getBlobClient(containerName, fileName);

      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setMinutes(startDate.getMinutes() + 100);
      startDate.setMinutes(startDate.getMinutes() - 100);

      const sharedAccessPolicy = {
        permissions: BlobSASPermissions.parse('r'), // Permissão de leitura
        startsOn: startDate,
        expiresOn: expiryDate,
      };

      const token = await blobClient.generateSasUrl(sharedAccessPolicy);

      return token;
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate temporary URL: ${error.message}.`,
      );
    }
  }

  async listFiles(containerName: string): Promise<SuccessResponse[]> {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        this.azureConnection,
      );
      const containerClient =
        blobServiceClient.getContainerClient(containerName);

      const files: SuccessResponse[] = [];

      for await (const blob of containerClient.listBlobsFlat()) {
        const temporaryUrl = await this.generateTemporaryUrl(
          blob.name,
          containerName,
        );

        files.push({
          message: `File ${blob.name} listed successfully`,
          fileName: blob.name,
          containerName,
          url: temporaryUrl,
        });
      }

      return files;
    } catch (error) {
      throw new BadRequestException(`Failed to list files: ${error.message}.`);
    }
  }
}
