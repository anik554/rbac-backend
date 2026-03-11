import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';

import { CreateLeadDto, LeadsService, UpdateLeadDto } from './leads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionAtom } from '../../common/enums/permission.enum';


@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  @RequirePermissions(PermissionAtom.LEADS_VIEW)
  findAll(@CurrentUser() user: any) {
    return this.leadsService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions(PermissionAtom.LEADS_VIEW)
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionAtom.LEADS_CREATE)
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: any, @Req() req: any) {
    return this.leadsService.create(dto, user, req.ip || '');
  }

  @Patch(':id')
  @RequirePermissions(PermissionAtom.LEADS_EDIT)
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: any, @Req() req: any) {
    return this.leadsService.update(id, dto, user, req.ip || '');
  }

  @Delete(':id')
  @RequirePermissions(PermissionAtom.LEADS_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.leadsService.remove(id, user, req.ip || '');
  }
}
