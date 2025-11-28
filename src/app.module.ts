import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MinioModule } from './minio/minio.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerConfigModule } from './common/throttler.module';
import { BsebModule } from './bseb/bseb.module';

@Module({
  imports: [
    ThrottlerConfigModule,
    PrismaModule,
    RedisModule,
    MinioModule,
    AuthModule,
    ProfileModule,
    BsebModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
