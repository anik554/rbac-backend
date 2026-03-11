import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Permission } from '../entities/permission.entity';
import {
  CreateUserDto,
  FilterUsersDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto';
import { RoleType } from '../common/enums/role.enum';
import { UserStatus } from '../entities/user.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../common/enums/permission.enum';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  // ─── List Users ───────────────────────────────────────────────────────────────
  async findAll(requestor: AuthenticatedUser, filters: FilterUsersDto) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('u.manager', 'manager')
      .select([
        'u.id', 'u.firstName', 'u.lastName', 'u.email',
        'u.status', 'u.phone', 'u.avatarUrl', 'u.createdAt',
        'role.id', 'role.name',
        'manager.id', 'manager.firstName', 'manager.lastName',
      ]);

    // Managers can only see their own team
    if (requestor.role === RoleType.MANAGER) {
      qb.andWhere('u.manager.id = :mid', { mid: requestor.id });
    }

    if (filters.role) qb.andWhere('role.name = :role', { role: filters.role });
    if (filters.status) qb.andWhere('u.status = :status', { status: filters.status });
    if (filters.managerId) qb.andWhere('u.manager.id = :mid', { mid: filters.managerId });
    if (filters.search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }

    return qb.orderBy('u.createdAt', 'DESC').getMany();
  }

  // ─── Get One ─────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'role.permissions', 'extraPermissions', 'manager'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────
  async create(dto: CreateUserDto, requestor: AuthenticatedUser, ip: string) {
    // Managers can only create agents and customers
    if (
      requestor.role === RoleType.MANAGER &&
      ![RoleType.AGENT, RoleType.CUSTOMER].includes(dto.role)
    ) {
      throw new ForbiddenException('Managers can only create Agents or Customers');
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const role = await this.roleRepo.findOne({ where: { name: dto.role } });
    if (!role) throw new NotFoundException(`Role "${dto.role}" not found`);

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      role,
    });

    // Assign default permissions for their role
    const defaultAtoms = DEFAULT_ROLE_PERMISSIONS[dto.role] || [];
    user.extraPermissions = await this.permRepo.findByIds(
      (await this.permRepo.find()).filter((p) => defaultAtoms.includes(p.atom as any)).map((p) => p.id),
    );

    // Assign manager
    if (dto.managerId) {
      const manager = await this.userRepo.findOne({ where: { id: dto.managerId } });
      if (manager) user.manager = manager;
    } else if (requestor.role === RoleType.MANAGER) {
      const manager = await this.userRepo.findOne({ where: { id: requestor.id } });
      if (manager) user.manager = manager;
    }

    const saved = await this.userRepo.save(user);

    await this.logAudit(
      requestor.id, 'user.created', 'user', saved.id,
      `Created user ${saved.email} with role ${dto.role}`, ip,
      { role: dto.role },
    );

    return this.findOne(saved.id);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto, requestor: AuthenticatedUser, ip: string) {
    const user = await this.findOne(id);
    this.assertManagerScope(requestor, user);

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);

    await this.logAudit(requestor.id, 'user.updated', 'user', id, `Updated user ${user.email}`, ip, dto);
    return saved;
  }

  // ─── Change Status ────────────────────────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateUserStatusDto, requestor: AuthenticatedUser, ip: string) {
    const user = await this.findOne(id);
    this.assertManagerScope(requestor, user);

    // Prevent self-suspension/ban
    if (user.id === requestor.id)
      throw new ForbiddenException('Cannot change your own status');

    const oldStatus = user.status;
    user.status = dto.status;
    await this.userRepo.save(user);

    await this.logAudit(
      requestor.id, `user.status.${dto.status}`, 'user', id,
      `Status changed: ${oldStatus} → ${dto.status}`, ip,
      { from: oldStatus, to: dto.status },
    );

    return { message: `User ${dto.status} successfully` };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────
  async remove(id: string, requestor: AuthenticatedUser, ip: string) {
    if (requestor.role !== RoleType.ADMIN)
      throw new ForbiddenException('Only Admins can delete users');

    const user = await this.findOne(id);
    if (user.id === requestor.id)
      throw new ForbiddenException('Cannot delete yourself');

    await this.userRepo.remove(user);
    await this.logAudit(requestor.id, 'user.deleted', 'user', id, `Deleted user ${user.email}`, ip);

    return { message: 'User deleted' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private assertManagerScope(requestor: AuthenticatedUser, target: User) {
    if (requestor.role === RoleType.ADMIN) return; // Admin has full scope
    if (requestor.role === RoleType.MANAGER) {
      if (target.manager?.id !== requestor.id)
        throw new ForbiddenException('Cannot modify users outside your team');
    } else {
      throw new ForbiddenException('Insufficient privileges');
    }
  }

  private async logAudit(
    actorId: string, action: string, resource: string,
    resourceId: string, description: string, ip: string,
    metadata?: Record<string, any>,
  ) {
    const log = this.auditRepo.create({ actorId, action, resource, resourceId, description, ipAddress: ip, metadata });
    await this.auditRepo.save(log);
  }
}
