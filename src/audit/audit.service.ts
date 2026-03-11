import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditFilterDto } from './dto/audit-filter.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

async findAll(filters: AuditFilterDto) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const qb = this.auditRepo
    .createQueryBuilder('log')
    .leftJoinAndSelect('log.actor', 'actor')
    .orderBy('log.createdAt', 'DESC')
    .skip(skip)
    .take(limit);

  if (filters.actorId) {
    qb.andWhere('log.actorId = :actorId', { actorId: filters.actorId });
  }

  if (filters.resource) {
    qb.andWhere('log.resource = :resource', { resource: filters.resource });
  }

  if (filters.action) {
    qb.andWhere('log.action ILIKE :action', { action: `%${filters.action}%` });
  }

  if (filters.from && filters.to) {
    qb.andWhere('log.createdAt BETWEEN :from AND :to', {
      from: filters.from,
      to: filters.to,
    });
  }

  if (filters.search) {
    qb.andWhere(
      '(log.description ILIKE :search OR log.action ILIKE :search)',
      { search: `%${filters.search}%` },
    );
  }

  const [data, total] = await qb.getManyAndCount();

  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
}
