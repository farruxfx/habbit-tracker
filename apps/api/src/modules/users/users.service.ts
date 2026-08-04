import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    isBanned?: boolean;
    isPremium?: boolean;
  }) {
    const { page = 1, limit = 20, search, isBanned, isPremium } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isBanned !== undefined) {
      where.isBanned = isBanned;
    }

    if (isPremium !== undefined) {
      where.isPremium = isPremium;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: { select: { id: true, username: true } },
          _count: { select: { downloads: true, referrals: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        downloads: { include: { movie: true }, orderBy: { createdAt: 'desc' }, take: 10 },
        referrals: { take: 10 },
      },
    });
  }

  async findByTelegramId(telegramId: bigint) {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async banUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isBanned: true },
    });
  }

  async unbanUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isBanned: false },
    });
  }

  async setPremium(id: string, isPremium: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isPremium },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async exportUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        language: true,
        isBanned: true,
        isPremium: true,
        bonusPoints: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
  }
}
