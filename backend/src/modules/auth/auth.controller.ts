import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';

interface RegisterDto {
  email?: string;
  password?: string;
  nombre?: string;
  name?: string;
}

interface LoginDto {
  email?: string;
  password?: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractToken(authHeader?: string): string | undefined {
    if (!authHeader) return undefined;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
    return authHeader;
  }

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  getMe(@Headers('authorization') authHeader?: string) {
    const token = this.extractToken(authHeader);
    return this.authService.getMe(token);
  }

  @Post('logout')
  logout(@Headers('authorization') authHeader?: string) {
    const token = this.extractToken(authHeader);
    return this.authService.logout(token);
  }
}
