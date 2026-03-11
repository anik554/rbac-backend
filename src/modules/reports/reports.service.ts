import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Lead, LeadStatus } from '../../entities/lead.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';

import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';


interface StatusCount {
  status: string;
  count: string;
}

interface TopAgent {
  agentId: string;
  firstName: string;
  lastName: string;
  leadsCount: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getSummary(requestor: AuthenticatedUser) {
    if (!requestor?.id || !requestor?.role) {
      throw new ForbiddenException('Invalid authenticated user');
    }



    const leadsByStatus = await this.leadRepo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.status')
      .getRawMany<StatusCount>();

    const tasksByStatus = await this.taskRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany<StatusCount>();

    const topAgentsQuery = this.leadRepo
      .createQueryBuilder('l')
      .leftJoin('l.assignedTo', 'agent')
      .where('agent.id IS NOT NULL') 
      .select([
        'agent.id AS "agentId"',
        'agent.firstName AS "firstName"',
        'agent.lastName AS "lastName"',
        'COUNT(l.id) AS "leadsCount"',
      ])
      .groupBy('agent.id, agent.firstName, agent.lastName')
      .orderBy('"leadsCount"', 'DESC')
      .limit(10);

    const topAgents = await topAgentsQuery.getRawMany<TopAgent>();

    const formattedTopAgents = topAgents.map(agent => ({
      ...agent,
      leadsCount: Number(agent.leadsCount),
    }));

    return {
      success: true,
      data: {
        leads: {
          byStatus: leadsByStatus.map(item => ({
            status: item.status ?? 'unknown',
            count: Number(item.count),
          })),
        },
        tasks: {
          byStatus: tasksByStatus.map(item => ({
            status: item.status ?? 'unknown',
            count: Number(item.count),
          })),
        },
        topAgents: formattedTopAgents,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        requestedByRole: requestor.role,
      },
    };
  }
}