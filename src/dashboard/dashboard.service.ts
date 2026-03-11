import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Lead } from '../entities/lead.entity';
import { Task } from '../entities/task.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { RoleType } from '../common/enums/role.enum';
import { UserStatus } from '../entities/user.entity';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async getStats(requestor: AuthenticatedUser) {
    const isAdmin = requestor.role === RoleType.ADMIN;
    const isManager = requestor.role === RoleType.MANAGER;

    // User counts
    const userQb = this.userRepo.createQueryBuilder('u').leftJoin('u.role', 'r');
    if (isManager) userQb.where('u.manager_id = :mid', { mid: requestor.id });

    const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
      userQb.getCount(),
      userQb.clone().andWhere('u.status = :s', { s: UserStatus.ACTIVE }).getCount(),
      userQb.clone().andWhere('u.status = :s', { s: UserStatus.SUSPENDED }).getCount(),
    ]);

    // Leads
    const leadQb = this.leadRepo.createQueryBuilder('l');
    if (!isAdmin) leadQb.where('l.assigned_to_id = :uid', { uid: requestor.id });
    const totalLeads = await leadQb.getCount();

    // Tasks
    const taskQb = this.taskRepo.createQueryBuilder('t');
    if (!isAdmin) taskQb.where('t.assigned_to_id = :uid', { uid: requestor.id });
    const totalTasks = await taskQb.getCount();

    // Recent audit activity (last 10)
    const recentActivity = await this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['actor'],
    });

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      leads: { total: totalLeads },
      tasks: { total: totalTasks },
      recentActivity,
    };
  }
}
