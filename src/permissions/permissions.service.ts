import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import {
  GrantPermissionsDto,
  RevokePermissionsDto,
  SetUserPermissionsDto,
} from './dto/permissions.dto';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';
import { RoleType } from '../common/enums/role.enum';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  /** List all available permission atoms */
  async listAll() {
    return this.permRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  /** Get resolved permissions for a specific user */
  async getUserPermissions(targetId: string) {
    const user = await this.loadUser(targetId);
    return {
      userId: user.id,
      rolePermissions: (user.role?.permissions || []).map((p) => p.atom),
      extraPermissions: (user.extraPermissions || []).map((p) => p.atom),
      resolved: user.resolvedPermissions,
    };
  }

  /**
   * Grant permission atoms to a target user.
   * GRANT CEILING: requestor cannot grant atoms they don't hold themselves.
   */
  async grantPermissions(dto: GrantPermissionsDto, requestor: AuthenticatedUser, ip: string) {
    const target = await this.loadUser(dto.targetUserId);
    this.assertCanModify(requestor, target);

    // Grant ceiling check
    const forbidden = dto.atoms.filter((a) => !requestor.permissions.includes(a));
    if (forbidden.length > 0) {
      throw new ForbiddenException(
        `Cannot grant permissions you don't hold: ${forbidden.join(', ')}`,
      );
    }

    const toGrant = await this.permRepo.find({ where: { atom: In(dto.atoms) } });
    const existingAtoms = target.extraPermissions.map((p) => p.atom);
    const newPerms = toGrant.filter((p) => !existingAtoms.includes(p.atom));

    target.extraPermissions = [...target.extraPermissions, ...newPerms];
    await this.userRepo.save(target);

    await this.logAudit(
      requestor.id, 'permissions.granted', 'user', target.id,
      `Granted [${dto.atoms.join(', ')}] to ${target.email}`, ip,
      { granted: dto.atoms },
    );

    return { message: 'Permissions granted', granted: dto.atoms };
  }

  /**
   * Revoke permission atoms from a target user.
   */
  async revokePermissions(dto: RevokePermissionsDto, requestor: AuthenticatedUser, ip: string) {
    const target = await this.loadUser(dto.targetUserId);
    this.assertCanModify(requestor, target);

    target.extraPermissions = target.extraPermissions.filter(
      (p) => !dto.atoms.includes(p.atom),
    );
    await this.userRepo.save(target);

    await this.logAudit(
      requestor.id, 'permissions.revoked', 'user', target.id,
      `Revoked [${dto.atoms.join(', ')}] from ${target.email}`, ip,
      { revoked: dto.atoms },
    );

    return { message: 'Permissions revoked', revoked: dto.atoms };
  }

  /**
   * Replace a user's extra permissions entirely.
   * Grant ceiling still applies — you can't set atoms you don't have.
   */
  async setUserPermissions(
    targetId: string,
    dto: SetUserPermissionsDto,
    requestor: AuthenticatedUser,
    ip: string,
  ) {
    const target = await this.loadUser(targetId);
    this.assertCanModify(requestor, target);

    const forbidden = dto.atoms.filter((a) => !requestor.permissions.includes(a));
    if (forbidden.length > 0) {
      throw new ForbiddenException(
        `Cannot grant permissions you don't hold: ${forbidden.join(', ')}`,
      );
    }

    const perms = await this.permRepo.find({ where: { atom: In(dto.atoms) } });
    target.extraPermissions = perms;
    await this.userRepo.save(target);

    await this.logAudit(
      requestor.id, 'permissions.set', 'user', target.id,
      `Set permissions for ${target.email}`, ip, { atoms: dto.atoms },
    );

    return { message: 'Permissions updated', permissions: dto.atoms };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private async loadUser(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'role.permissions', 'extraPermissions', 'manager'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Admin can modify anyone. Manager can only modify their own team members. */
  private assertCanModify(requestor: AuthenticatedUser, target: User) {
    if (requestor.role === RoleType.ADMIN) return;
    if (requestor.role === RoleType.MANAGER) {
      if (target.manager?.id !== requestor.id) {
        throw new ForbiddenException('Cannot manage permissions for users outside your team');
      }
    } else {
      throw new ForbiddenException('Insufficient privileges');
    }
  }

  private async logAudit(
    actorId: string, action: string, resource: string, resourceId: string,
    description: string, ip: string, metadata?: Record<string, any>,
  ) {
    const log = this.auditRepo.create({ actorId, action, resource, resourceId, description, ipAddress: ip, metadata });
    await this.auditRepo.save(log);
  }
}
