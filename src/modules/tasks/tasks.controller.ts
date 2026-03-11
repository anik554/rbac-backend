import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';

import { CreateTaskDto, TasksService, UpdateTaskDto } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionAtom } from '../../common/enums/permission.enum';


@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @RequirePermissions(PermissionAtom.TASKS_VIEW)
  findAll(@CurrentUser() user: any) {
    return this.tasksService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions(PermissionAtom.TASKS_VIEW)
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionAtom.TASKS_CREATE)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: any, @Req() req: any) {
    return this.tasksService.create(dto, user, req.ip || '');
  }

  @Patch(':id')
  @RequirePermissions(PermissionAtom.TASKS_EDIT)
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any, @Req() req: any) {
    return this.tasksService.update(id, dto, user, req.ip || '');
  }

  @Delete(':id')
  @RequirePermissions(PermissionAtom.TASKS_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.tasksService.remove(id, user, req.ip || '');
  }
}
