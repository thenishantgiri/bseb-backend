import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  // SRS Requirement: Log all authentication attempts
  async logAuthEvent(
    action: string,
    identifier?: string,
    studentId?: number,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          identifier,
          studentId,
          ipAddress,
          userAgent,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.error('Failed to create audit log:', error);
    }
  }

  // Get audit logs for a specific student
  async getStudentLogs(studentId: number, limit: number = 50) {
    return await this.prisma.auditLog.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Get recent login attempts for an identifier (for security monitoring)
  async getRecentLoginAttempts(identifier: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await this.prisma.auditLog.findMany({
      where: {
        identifier,
        action: {
          in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'OTP_LOGIN_SUCCESS', 'OTP_LOGIN_FAILED'],
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
