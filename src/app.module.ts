import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// Entities
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Lead } from './entities/lead.entity';
import { Task } from './entities/task.entity';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeadsModule } from './modules/leads/leads.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60),
            limit: config.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';

        return {
          type: 'postgres',

          // ─── The most important line ───
          url: config.get<string>('DATABASE_URL'), // or process.env.DATABASE_URL

          // Remove or comment these out – they conflict with url
          // host: config.get('DB_HOST', 'localhost'),
          // port: config.get<number>('DB_PORT', 5432),
          // username: config.get('DB_USERNAME', 'postgres'),
          // password: config.get('DB_PASSWORD', ''),
          // database: config.get('DB_NAME', 'rbac_db'),

          ssl: true, // almost always needed with Neon
          extra: {
            ssl: {
              rejectUnauthorized: false, // very common fix for self-signed cert issues in Neon + Node
            },
          },

          entities: [User, Role, Permission, AuditLog, Lead, Task],

          // Important for production / serverless
          synchronize: false, // NEVER true in prod
          logging: !isProduction,

          // Optional but helpful in serverless (limits connections, prevents leaks)
          poolSize: 5, // keep small → Neon pooler handles the rest
          maxQueryExecutionTime: 8000, // fail fast on slow queries
        };
      },
    }),

    AuthModule,
    UsersModule,
    PermissionsModule,
    AuditModule,
    DashboardModule,
    LeadsModule,
    TasksModule,
    ReportsModule,
  ],
})
export class AppModule {}
