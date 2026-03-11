import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskPriority, TaskStatus } from '../../entities/task.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { RoleType } from '../../common/enums/role.enum';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(requestor: AuthenticatedUser) {
    const qb = this.taskRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.createdBy', 'createdBy');
    if (requestor.role === RoleType.AGENT) {
      qb.where('t.assigned_to_id = :uid', { uid: requestor.id });
    }
    return qb.orderBy('t.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const task = await this.taskRepo.findOne({ where: { id }, relations: ['assignedTo', 'createdBy'] });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto, requestor: AuthenticatedUser, ip: string) {
    const task = this.taskRepo.create({ ...dto, createdBy: { id: requestor.id } as User });
    if (dto.assignedToId) task.assignedTo = { id: dto.assignedToId } as User;
    const saved = await this.taskRepo.save(task);
    await this.audit(requestor.id, 'task.created', saved.id, `Created task: ${saved.title}`, ip);
    return saved;
  }

  async update(id: string, dto: UpdateTaskDto, requestor: AuthenticatedUser, ip: string) {
    const task = await this.findOne(id);
    if (dto.assignedToId) { task.assignedTo = { id: dto.assignedToId } as User; delete dto.assignedToId; }
    Object.assign(task, dto);
    const saved = await this.taskRepo.save(task);
    await this.audit(requestor.id, 'task.updated', id, `Updated task: ${task.title}`, ip);
    return saved;
  }

  async remove(id: string, requestor: AuthenticatedUser, ip: string) {
    const task = await this.findOne(id);
    await this.taskRepo.remove(task);
    await this.audit(requestor.id, 'task.deleted', id, `Deleted task: ${task.title}`, ip);
    return { message: 'Task deleted' };
  }

  private async audit(actorId: string, action: string, resourceId: string, description: string, ip: string) {
    await this.auditRepo.save(this.auditRepo.create({ actorId, action, resource: 'task', resourceId, description, ipAddress: ip }));
  }
}
