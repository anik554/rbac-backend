import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { CurrentUser, Public } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** POST /auth/login — get access + refresh tokens */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.authService.login(dto, ip ?? '');
  }

  /** POST /auth/refresh — exchange refresh token for new pair */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refresh(body.userId, body.refreshToken);
  }

  /** POST /auth/logout — blacklist refresh token */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: any, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.authService.logout(user.id, ip ?? '');
  }

  /** GET /auth/me — return current user profile + permissions */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  /** POST /auth/change-password */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.authService.changePassword(user.id, dto, ip ?? '');
  }
}
