import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MoviesModule } from './modules/movies/movies.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get('THROTTLE_TTL_SHORT', 10000),
            limit: config.get('THROTTLE_LIMIT_SHORT', 3),
          },
          {
            name: 'medium',
            ttl: config.get('THROTTLE_TTL_MEDIUM', 60000),
            limit: config.get('THROTTLE_LIMIT_MEDIUM', 10),
          },
          {
            name: 'long',
            ttl: config.get('THROTTLE_TTL_LONG', 3600000),
            limit: config.get('THROTTLE_LIMIT_LONG', 100),
          },
        ],
      }),
    }),

    // Redis cache
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: require('cache-manager-redis-yet'),
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get('REDIS_PORT', 6379),
        ttl: config.get('CACHE_TTL', 300),
      }),
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Modules
    PrismaModule,
    AuthModule,
    UsersModule,
    MoviesModule,
    ChannelsModule,
    BroadcastsModule,
    SettingsModule,
    AnalyticsModule,
    TelegramModule,
  ],
})
export class AppModule {}
