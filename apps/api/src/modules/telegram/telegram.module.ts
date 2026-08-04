import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { TelegramGateway } from './telegram.gateway';

@Module({
  imports: [ConfigModule],
  providers: [TelegramService, TelegramGateway],
  exports: [TelegramService],
})
export class TelegramModule {}
