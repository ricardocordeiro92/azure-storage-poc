import { Module } from '@nestjs/common';
import { AzureBlobController } from './http/controllers/azure-blob.controller';
import { AzureBlobService } from './services/azure-blob.service';

@Module({
  imports: [],
  controllers: [AzureBlobController],
  providers: [AzureBlobService],
})
export class AzureBlobModule {}
