import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    
    if (!admin || !admin.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const { password: _, ...result } = admin;
    return result;
  }

  async login(admin: any) {
    const payload = { 
      email: admin.email, 
      sub: admin.id,
      role: admin.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
    };
  }

  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await this.prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'MANAGER',
      },
    });

    return this.login(admin);
  }

  async changePassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    
    if (!admin) {
      throw new Error('Admin not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
