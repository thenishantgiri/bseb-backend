import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  // Create a new session when user logs in
  async createSession(
    studentId: number,
    token: string,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return await this.prisma.session.create({
      data: {
        studentId,
        token,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
  }

  // Get all active sessions for a student
  async getActiveSessions(studentId: number) {
    return await this.prisma.session.findMany({
      where: {
        studentId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  // Update session last used time
  async updateSessionActivity(token: string) {
    try {
      await this.prisma.session.update({
        where: { token },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      // Session might not exist or already expired
      console.error('Failed to update session activity:', error);
    }
  }

  // Revoke a specific session
  async revokeSession(sessionId: string, studentId: number) {
    return await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        studentId,
      },
      data: {
        isActive: false,
      },
    });
  }

  // Revoke all sessions except current (for "logout all other devices")
  async revokeOtherSessions(studentId: number, currentToken: string) {
    return await this.prisma.session.updateMany({
      where: {
        studentId,
        token: {
          not: currentToken,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  // Revoke all sessions (for "logout all devices")
  async revokeAllSessions(studentId: number) {
    return await this.prisma.session.updateMany({
      where: {
        studentId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  // Cleanup expired sessions (should be run periodically)
  async cleanupExpiredSessions() {
    return await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false },
        ],
      },
    });
  }

  // Verify if session is valid
  async verifySession(token: string): Promise<number | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return null;
    }

    // Update last used time
    await this.updateSessionActivity(token);

    return session.studentId;
  }
}
