import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AzureBlobModule } from './azure-blob/azure-blob.module';

@Module({
  imports: [ConfigModule.forRoot(), AzureBlobModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
