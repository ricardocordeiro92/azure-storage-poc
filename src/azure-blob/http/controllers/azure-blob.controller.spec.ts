import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { SuccessResponse } from 'src/azure-blob/dtos/successResponse';
import { AzureBlobService } from '../../services/azure-blob.service';
import { AzureBlobController } from './azure-blob.controller';

describe('AzureBlobController', () => {
  const fileName = 'test.txt';
  const res: Partial<Response> = {
    setHeader: jest.fn(),
    end: jest.fn(),
    write: jest.fn(),
  };
  const readableStreamMock = {
    pipe: jest.fn(),
  } as unknown as NodeJS.ReadableStream;

  let controller: AzureBlobController;
  let azureBlobService: AzureBlobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureBlobController],
      providers: [AzureBlobService],
    }).compile();

    controller = module.get<AzureBlobController>(AzureBlobController);
    azureBlobService = module.get<AzureBlobService>(AzureBlobService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upload', () => {
    it('should upload file successfully', async () => {
      const file = {
        buffer: Buffer.from('Test file content'),
        originalname: fileName,
      } as Express.Multer.File;

      const response: SuccessResponse = {
        message: 'File uploaded successfully',
        fileName: fileName,
        containerName: 'container-test',
        url: 'any_url',
      };

      jest
        .spyOn(azureBlobService, 'uploadFile')
        .mockResolvedValueOnce(response);

      const result = await controller.upload(file);

      expect(result).toEqual(response);
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      jest
        .spyOn(azureBlobService, 'getFile')
        .mockResolvedValueOnce(readableStreamMock);

      await controller.readFile(res as Response, fileName);

      expect(readableStreamMock.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      jest
        .spyOn(azureBlobService, 'deleteFile')
        .mockResolvedValueOnce(`File ${fileName} deleted successfully.`);

      const result = await controller.delete(fileName);

      expect(result).toEqual(`File ${fileName} deleted successfully.`);
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      jest
        .spyOn(azureBlobService, 'getFile')
        .mockResolvedValueOnce(readableStreamMock);

      await controller.downloadFile(res as Response, fileName);

      expect(readableStreamMock.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('listAll', () => {
    it('should list all files with successfully', async () => {
      const response: SuccessResponse[] = [
        {
          message: `File ${fileName} listed successfully`,
          fileName: fileName,
          containerName: 'container-test',
          url: 'any_url',
        },
        {
          message: `File test2.jpg listed successfully`,
          fileName: 'test2.jpg',
          containerName: 'container-test',
          url: 'any_url_2',
        },
      ];

      jest.spyOn(azureBlobService, 'listFiles').mockResolvedValueOnce(response);

      const files = await controller.listFiles();

      expect(files).toEqual(response);
    });
  });
});
