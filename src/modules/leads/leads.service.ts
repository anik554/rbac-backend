import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/lead.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { RoleType } from '../../common/enums/role.enum';
import {
  IsEnum, IsOptional, IsString, IsUUID,
} from 'class-validator';

export class CreateLeadDto {
  @IsString() name: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(requestor: AuthenticatedUser) {
    const qb = this.leadRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.assignedTo', 'assignedTo')
      .leftJoinAndSelect('l.createdBy', 'createdBy');

    if (requestor.role === RoleType.AGENT) {
      qb.where('l.assigned_to_id = :uid', { uid: requestor.id });
    }

    return qb.orderBy('l.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const lead = await this.leadRepo.findOne({ where: { id }, relations: ['assignedTo', 'createdBy'] });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(dto: CreateLeadDto, requestor: AuthenticatedUser, ip: string) {
    const lead = this.leadRepo.create({ ...dto, createdBy: { id: requestor.id } as User });
    if (dto.assignedToId) lead.assignedTo = { id: dto.assignedToId } as User;
    const saved = await this.leadRepo.save(lead);
    await this.audit(requestor.id, 'lead.created', saved.id, `Created lead: ${saved.name}`, ip);
    return saved;
  }

  async update(id: string, dto: UpdateLeadDto, requestor: AuthenticatedUser, ip: string) {
    const lead = await this.findOne(id);
    if (dto.assignedToId) { lead.assignedTo = { id: dto.assignedToId } as User; delete dto.assignedToId; }
    Object.assign(lead, dto);
    const saved = await this.leadRepo.save(lead);
    await this.audit(requestor.id, 'lead.updated', id, `Updated lead: ${lead.name}`, ip);
    return saved;
  }

  async remove(id: string, requestor: AuthenticatedUser, ip: string) {
    const lead = await this.findOne(id);
    await this.leadRepo.remove(lead);
    await this.audit(requestor.id, 'lead.deleted', id, `Deleted lead: ${lead.name}`, ip);
    return { message: 'Lead deleted' };
  }

  private async audit(actorId: string, action: string, resourceId: string, description: string, ip: string) {
    await this.auditRepo.save(this.auditRepo.create({ actorId, action, resource: 'lead', resourceId, description, ipAddress: ip }));
  }
}
