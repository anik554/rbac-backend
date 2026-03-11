import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Who performed the action */
  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ nullable: true })
  actorId: string;

  /** The action performed, e.g. "user.created", "permission.granted" */
  @Column()
  action: string;

  /** Resource type affected */
  @Column()
  resource: string;

  /** ID of the affected resource */
  @Column({ nullable: true })
  resourceId: string;

  /** Human-readable description */
  @Column({ nullable: true })
  description: string;

  /** JSON snapshot of the change (before/after) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /** IP address of the requester */
  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
