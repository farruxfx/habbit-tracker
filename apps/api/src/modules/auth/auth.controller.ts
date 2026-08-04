import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @UseGuards(LocalAuthGuard)
  async login(@Request() req: any) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new admin (first time setup)' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(
    @Body() body: { email: string; password: string; firstName?: string; lastName?: string },
  ) {
    // Check if this is the first admin
    const existingAdmins = await (this.authService as any).prisma.admin.count();
    
    if (existingAdmins > 0) {
      throw new Error('Registration disabled. Contact super admin.');
    }
    
    return this.authService.register(body.email, body.password, body.firstName, body.lastName);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@Request() req: any) {
    return req.user;
  }
}
