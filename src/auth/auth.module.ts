import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FileValidationService } from '../common/file-validation.service';
import { AuditLogService } from '../common/audit-log.service';
import { SessionService } from '../common/session.service';
import { TwilioService } from '../common/twilio.service';
import { RedisService } from '../redis/redis.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '30d' },
    }),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    FileValidationService,
    AuditLogService,
    SessionService,
    TwilioService,
    RedisService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
