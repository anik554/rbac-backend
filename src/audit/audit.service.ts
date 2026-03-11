import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export class AuditFilterDto {
  actorId?: string;
  resource?: string;
  action?: string;
  from?: string; // ISO date
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(filters: AuditFilterDto) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .select([
        'log.id', 'log.action', 'log.resource', 'log.resourceId',
        'log.description', 'log.metadata', 'log.ipAddress', 'log.createdAt',
        'log.actorId',
        'actor.id', 'actor.firstName', 'actor.lastName', 'actor.email',
      ]);

    if (filters.actorId) qb.andWhere('log.actorId = :aid', { aid: filters.actorId });
    if (filters.resource) qb.andWhere('log.resource = :res', { res: filters.resource });
    if (filters.action) qb.andWhere('log.action ILIKE :act', { act: `%${filters.action}%` });
    if (filters.from) qb.andWhere('log.createdAt >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('log.createdAt <= :to', { to: filters.to });
    if (filters.search) {
      qb.andWhere('(log.description ILIKE :s OR log.action ILIKE :s)', { s: `%${filters.search}%` });
    }

    const [data, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}
