import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        dateOfBirth: true,
        is18PlusVerified: true,
        kycStatus: true,
        level: true,
        xp: true,
        isBanned: true,
        banReason: true,
        latitude: true,
        longitude: true,
        subscription: true,
        wallet: {
          select: {
            id: true,
            balanceTokens: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { latitude, longitude },
      select: { id: true, latitude: true, longitude: true }
    });
  }
}


