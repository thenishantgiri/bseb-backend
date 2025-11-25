import { Controller, Get, Put, Post, Delete, Body, UseInterceptors, UploadedFile, Param, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { MinioService } from '../minio/minio.service';
import { FileValidationService } from '../common/file-validation.service';
import { SessionService } from '../common/session.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpgradeClassDto } from './dto/upgrade-class.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private minioService: MinioService,
    private fileValidationService: FileValidationService,
    private sessionService: SessionService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateDto);
  }

  @Post('image/:type')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @CurrentUser() user: any,
    @Param('type') type: 'photo' | 'signature',
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Validate file based on type
    if (type === 'photo') {
      this.fileValidationService.validatePhoto(file);
    } else {
      this.fileValidationService.validateSignature(file);
    }

    // Upload to MinIO
    const folder = type === 'photo' ? 'photos' : 'signatures';
    const fileName = await this.minioService.uploadFile(file, folder);
    
    return this.profileService.uploadImage(user.id, type, fileName);
  }

  @Post('upgrade-class')
  async upgradeClass(
    @CurrentUser() user: any,
    @Body() upgradeDto: UpgradeClassDto,
  ) {
    return this.profileService.upgradeClass(user.id, upgradeDto);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.id, changePasswordDto);
  }

  // SRS Requirement: Session Management
  @Get('sessions')
  async getActiveSessions(@CurrentUser() user: any) {
    const sessions = await this.sessionService.getActiveSessions(user.id);
    return {
      status: 1,
      data: sessions,
    };
  }

  @Delete('sessions/:sessionId')
  async revokeSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.revokeSession(sessionId, user.id);
    return {
      status: 1,
      message: 'Session revoked successfully',
    };
  }

  @Post('sessions/revoke-others')
  async revokeOtherSessions(@CurrentUser() user: any, @Req() request: any) {
    // Extract current token from request
    const token = request.headers.authorization?.replace('Bearer ', '');
    await this.sessionService.revokeOtherSessions(user.id, token);
    return {
      status: 1,
      message: 'All other sessions revoked successfully',
    };
  }

  @Post('sessions/revoke-all')
  async revokeAllSessions(@CurrentUser() user: any) {
    await this.sessionService.revokeAllSessions(user.id);
    return {
      status: 1,
      message: 'All sessions revoked successfully. Please login again.',
    };
  }

  @Delete()
  async deleteAccount(@CurrentUser() user: any) {
    return this.profileService.deleteAccount(user.id);
  }
}

