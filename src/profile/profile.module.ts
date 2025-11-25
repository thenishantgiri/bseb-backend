import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { FileValidationService } from '../common/file-validation.service';
import { SessionService } from '../common/session.service';

@Module({
  providers: [ProfileService, FileValidationService, SessionService],
  controllers: [ProfileController]
})
export class ProfileModule {}
