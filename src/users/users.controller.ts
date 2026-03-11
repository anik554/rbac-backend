import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import {
  CreateUserDto,
  FilterUsersDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PermissionAtom } from '../common/enums/permission.enum';


@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** GET /users */
  @Get()
  @RequirePermissions(PermissionAtom.USERS_VIEW)
  findAll(
    @CurrentUser() user: any,
    @Query() filters: FilterUsersDto,
  ) {
    return this.usersService.findAll(user, filters);
  }

  /** GET /users/:id */
  @Get(':id')
  @RequirePermissions(PermissionAtom.USERS_VIEW)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** POST /users */
  @Post()
  @RequirePermissions(PermissionAtom.USERS_CREATE)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.create(dto, user, req.ip || '');
  }

  /** PATCH /users/:id */
  @Patch(':id')
  @RequirePermissions(PermissionAtom.USERS_EDIT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, user, req.ip || '');
  }

  /** PATCH /users/:id/status — suspend or ban */
  @Patch(':id/status')
  @RequirePermissions(PermissionAtom.USERS_SUSPEND)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.updateStatus(id, dto, user, req.ip || '');
  }

  /** DELETE /users/:id */
  @Delete(':id')
  @RequirePermissions(PermissionAtom.USERS_DELETE)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.remove(id, user, req.ip || '');
  }
}
