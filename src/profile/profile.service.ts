import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: userId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Remove password from response
    const { password, ...studentWithoutPassword } = student;

    return {
      status: 1,
      data: studentWithoutPassword,
    };
  }

  async updateProfile(userId: number, updateDto: UpdateProfileDto) {
    const student = await this.prisma.student.update({
      where: { id: userId },
      data: updateDto,
    });

    const { password, ...studentWithoutPassword } = student;

    return {
      status: 1,
      message: 'Profile updated successfully',
      data: studentWithoutPassword,
    };
  }

  async uploadImage(userId: number, type: 'photo' | 'signature', filename: string) {
    const updateData = type === 'photo' 
      ? { photoUrl: filename }
      : { signatureUrl: filename };

    await this.prisma.student.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      status: 1,
      message: `${type} uploaded successfully`,
    };
  }

  async upgradeClass(userId: number, upgradeDto: any) {
    // Update class and related academic information
    const student = await this.prisma.student.update({
      where: { id: userId },
      data: {
        class: upgradeDto.newClass,
        stream: upgradeDto.newStream || undefined,
        rollNumber: upgradeDto.newRollNumber || undefined,
        rollCode: upgradeDto.newRollCode || undefined,
        registrationNumber: upgradeDto.newRegistrationNumber || undefined,
        schoolName: upgradeDto.newSchoolName || undefined,
      },
    });

    const { password, ...userWithoutPassword } = student;
    return {
      status: 1,
      message: 'Class upgraded successfully',
      data: userWithoutPassword,
    };
  }

  // SRS Requirement: Change Password while logged in (Profile → Security)
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    // Step 1: Find user
    const user = await this.prisma.student.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Step 2: Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Step 3: Check if new password is different from current
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password
    );

    if (isSamePassword) {
      throw new UnauthorizedException('New password must be different from current password');
    }

    // Step 4: Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Step 5: Update password
    await this.prisma.student.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      status: 1,
      message: 'Password changed successfully',
    };
  }

  async deleteAccount(userId: number) {
    // Soft delete or hard delete based on requirements
    await this.prisma.student.delete({
      where: { id: userId },
    });

    return { status: 1, message: 'Account deleted successfully' };
  }
}

