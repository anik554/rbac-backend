import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { Task } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Task, User])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
