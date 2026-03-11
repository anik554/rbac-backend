import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/lead.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { RoleType } from '../../common/enums/role.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getSummary(requestor: AuthenticatedUser) {
    const isAdmin = requestor.role === RoleType.ADMIN;

    // Leads by status
    const leadsByStatus = await this.leadRepo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.status')
      .getRawMany();

    // Tasks by status
    const tasksByStatus = await this.taskRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany();

    // Top agents by leads assigned
    const topAgents = await this.leadRepo
      .createQueryBuilder('l')
      .leftJoin('l.assignedTo', 'agent')
      .select('agent.id', 'agentId')
      .addSelect('agent.firstName', 'firstName')
      .addSelect('agent.lastName', 'lastName')
      .addSelect('COUNT(*)', 'leadsCount')
      .groupBy('agent.id, agent.firstName, agent.lastName')
      .orderBy('leadsCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      leads: { byStatus: leadsByStatus },
      tasks: { byStatus: tasksByStatus },
      topAgents,
    };
  }
}
