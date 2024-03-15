import {
  BlobDeleteIfExistsResponse,
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
} from '@azure/storage-blob';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { AzureBlobService } from './azure-blob.service';

jest.mock('@azure/storage-blob');

describe('AzureBlobService', () => {
  const fileName = 'file.txt';
  const containerName = 'test-container';
  const file: Express.Multer.File = {
    buffer: Buffer.from('file content'),
    originalname: fileName,
    fieldname: '',
    encoding: '',
    mimetype: '',
    size: 0,
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  };
  let storageService: AzureBlobService;
  let mockBlobServiceClient: jest.Mocked<BlobServiceClient>;
  let mockContainerClient: jest.Mocked<ContainerClient>;
  let mockBlockBlobClient: jest.Mocked<BlockBlobClient>;

  beforeEach(() => {
    mockBlockBlobClient = {
      uploadData: jest.fn(),
      download: jest.fn().mockResolvedValue({ readableStreamBody: jest.fn() }),
      deleteIfExists: jest.fn().mockResolvedValue({ succeeded: true }),
      generateSasUrl: jest.fn().mockResolvedValue('any_url'),
    } as unknown as jest.Mocked<BlockBlobClient>;

    mockContainerClient = {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
      listBlobsFlat: jest.fn().mockReturnValue([{ name: fileName }]),
      getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient),
    } as unknown as jest.Mocked<ContainerClient>;

    mockBlobServiceClient = {
      getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
    } as unknown as jest.Mocked<BlobServiceClient>;

    (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(
      mockBlobServiceClient,
    );

    storageService = new AzureBlobService();
  });

  describe('getBlobClient', () => {
    it('should return blob client for given container and image name', async () => {
      const containerName = 'test-container';
      const imageName = 'image.jpg';

      const result = await storageService.getBlobClient(
        containerName,
        imageName,
      );

      expect(result).toEqual(mockBlockBlobClient);
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.exists).toHaveBeenCalled();
      expect(mockContainerClient.create).not.toHaveBeenCalled();
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        imageName,
      );
    });

    it('should create container if it does not exist and return blob client', async () => {
      const containerName = 'test-container';
      const imageName = 'image.jpg';

      mockContainerClient.exists.mockResolvedValue(false);

      const result = await storageService.getBlobClient(
        containerName,
        imageName,
      );

      expect(result).toEqual(mockBlockBlobClient);
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.exists).toHaveBeenCalled();
      expect(mockContainerClient.create).toHaveBeenCalled();
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        imageName,
      );
    });

    it('should throw BadRequestException if blob client is undefined', async () => {
      const containerName = 'test-container';
      const imageName = 'image.jpg';

      mockContainerClient.getBlockBlobClient.mockReturnValueOnce(undefined);

      await expect(
        storageService.getBlobClient(containerName, imageName),
      ).rejects.toThrowError(BadRequestException);

      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.exists).toHaveBeenCalled();
      expect(mockContainerClient.create).not.toHaveBeenCalled();
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        imageName,
      );
    });

    it('should throw BadRequestException if error occurs during getBlobClient', async () => {
      const containerName = 'test-container';
      const imageName = 'image.jpg';
      mockBlobServiceClient.getContainerClient.mockImplementationOnce(() => {
        throw new Error('Connection error');
      });

      await expect(
        storageService.getBlobClient(containerName, imageName),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('uploadFile', () => {
    it('should upload file to blob storage and return success response', async () => {
      const result = await storageService.uploadFile(file, containerName);

      expect(result.message).toEqual('File uploaded successfully');
      expect(result.fileName).toContain('file.txt');
      expect(result.containerName).toEqual(containerName);
      expect(result.url).toEqual('any_url');
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockBlockBlobClient.uploadData).toHaveBeenCalledWith(file.buffer);
    });

    it('should throw BadRequestException if upload fails', async () => {
      mockBlockBlobClient.uploadData.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        storageService.uploadFile(file, containerName),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('getFile', () => {
    it('should return readable stream for given file name and container', async () => {
      const result = await storageService.getFile(fileName, containerName);

      expect(result).toBeDefined();
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        fileName,
      );
      expect(mockBlockBlobClient.download).toHaveBeenCalled();
    });

    it('should throw BadRequestException if error occurs during getFile', async () => {
      mockBlockBlobClient.download.mockRejectedValue(
        new Error('Download failed'),
      );

      await expect(
        storageService.getFile(fileName, containerName),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file from blob storage and return success message', async () => {
      const result = await storageService.deleteFile(fileName, containerName);

      expect(result).toEqual(`File ${fileName} deleted successfully.`);
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        fileName,
      );
      expect(mockBlockBlobClient.deleteIfExists).toHaveBeenCalled();
    });

    it('should throw BadRequestException if delete fails', async () => {
      mockBlockBlobClient.deleteIfExists.mockResolvedValue({
        succeeded: false,
      } as unknown as BlobDeleteIfExistsResponse);

      await expect(
        storageService.deleteFile(fileName, containerName),
      ).rejects.toThrowError(BadRequestException);
    });

    it('should throw BadRequestException if error occurs during deleteFile', async () => {
      mockBlockBlobClient.deleteIfExists.mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(
        storageService.deleteFile(fileName, containerName),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('generateTemporaryUrl', () => {
    it('should generate temporary URL for the given file name and container', async () => {
      const result = await storageService.generateTemporaryUrl(
        fileName,
        containerName,
      );

      expect(result).toEqual('any_url');
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        fileName,
      );
      expect(mockBlockBlobClient.generateSasUrl).toHaveBeenCalled();
    });

    it('should throw BadRequestException if error occurs during generateTemporaryUrl', async () => {
      const errorMessage = 'Failed to generate URL';
      mockBlockBlobClient.generateSasUrl.mockRejectedValue(
        new BadRequestException(errorMessage),
      );

      try {
        await storageService.generateTemporaryUrl(fileName, containerName);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error).toHaveProperty(
          'message',
          `Failed to generate temporary URL: ${errorMessage}.`,
        );
      }
    });
  });

  describe('listFiles', () => {
    it('should return list of files in container', async () => {
      const result = await storageService.listFiles(containerName);

      expect(result).toHaveLength(1);
      expect(result).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: fileName,
            containerName,
            message: `File ${fileName} listed successfully`,
            url: 'any_url',
          }),
        ]),
      );
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(
        containerName,
      );
      expect(mockContainerClient.listBlobsFlat).toHaveBeenCalled();
    });

    it('should throw BadRequestException if error occurs during listFiles', async () => {
      const errorMessage = 'List files failed';
      mockContainerClient.listBlobsFlat.mockImplementationOnce(() => {
        throw new BadRequestException(errorMessage);
      });

      try {
        await storageService.listFiles(containerName);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error).toHaveProperty(
          'message',
          `Failed to list files: ${errorMessage}.`,
        );
      }
    });
  });
});
