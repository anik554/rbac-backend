import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { UserStatus } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, ip: string) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['role', 'role.permissions', 'extraPermissions'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException('Your account has been banned');
    if (user.status === UserStatus.SUSPENDED)
      throw new UnauthorizedException('Your account is suspended');

    const passwordValid = await user.comparePassword(dto.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);

    // Store hashed refresh token
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.save(user);

    // Audit
    await this.logAudit(user.id, 'auth.login', 'session', user.id, 'User logged in', ip);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────
  async refresh(userId: string, rawRefreshToken: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions', 'extraPermissions'],
    });

    if (!user || !user.refreshTokenHash)
      throw new UnauthorizedException('Access denied');

    const tokenMatches = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!tokenMatches) throw new UnauthorizedException('Access denied');

    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.save(user);

    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  async logout(userId: string, ip: string) {
    await this.userRepo.update(userId, { refreshTokenHash: '' });
    await this.logAudit(userId, 'auth.logout', 'session', userId, 'User logged out', ip);
    return { message: 'Logged out successfully' };
  }

  // ─── Change Password ─────────────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto, ip: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await user.comparePassword(dto.currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    user.password = dto.newPassword; // Will be hashed by @BeforeUpdate
    user.refreshTokenHash = ''; // Invalidate all sessions
    await this.userRepo.save(user);

    await this.logAudit(userId, 'auth.password_changed', 'user', userId, 'Password changed', ip);
    return { message: 'Password updated. Please log in again.' };
  }

  // ─── Me ──────────────────────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions', 'extraPermissions'],
    });
    if (!user) throw new UnauthorizedException();
    return {
      ...this.sanitizeUser(user),
      permissions: user.resolvedPermissions,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role.name };
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET', 'access_secret');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh_secret');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      } as any),
      this.jwt.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { password, refreshTokenHash, ...safe } = user as any;
    return safe;
  }

  private async logAudit(
    actorId: string,
    action: string,
    resource: string,
    resourceId: string,
    description: string,
    ip: string,
  ) {
    const log = this.auditRepo.create({
      actorId,
      action,
      resource,
      resourceId,
      description,
      ipAddress: ip,
    });
    await this.auditRepo.save(log);
  }
}
