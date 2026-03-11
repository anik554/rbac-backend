import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { PermissionsService } from './permissions.service';
import {
  GrantPermissionsDto,
  RevokePermissionsDto,
  SetUserPermissionsDto,
} from './dto/permissions.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PermissionAtom } from '../common/enums/permission.enum';


@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /** GET /permissions — list all available atoms */
  @Get()
  @RequirePermissions(PermissionAtom.PERMISSIONS_VIEW)
  listAll() {
    return this.permissionsService.listAll();
  }

  /** GET /permissions/users/:id — get a user's resolved permissions */
  @Get('users/:id')
  @RequirePermissions(PermissionAtom.PERMISSIONS_VIEW)
  getUserPermissions(@Param('id') id: string) {
    return this.permissionsService.getUserPermissions(id);
  }

  /** POST /permissions/grant — grant atoms to a user */
  @Post('grant')
  @RequirePermissions(PermissionAtom.PERMISSIONS_MANAGE)
  grant(
    @Body() dto: GrantPermissionsDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.permissionsService.grantPermissions(dto, user, req.ip || '');
  }

  /** POST /permissions/revoke — revoke atoms from a user */
  @Post('revoke')
  @RequirePermissions(PermissionAtom.PERMISSIONS_MANAGE)
  revoke(
    @Body() dto: RevokePermissionsDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.permissionsService.revokePermissions(dto, user, req.ip || '');
  }

  /** PATCH /permissions/users/:id — replace all extra permissions for a user */
  @Patch('users/:id')
  @RequirePermissions(PermissionAtom.PERMISSIONS_MANAGE)
  setUserPermissions(
    @Param('id') id: string,
    @Body() dto: SetUserPermissionsDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.permissionsService.setUserPermissions(id, dto, user, req.ip || '');
  }
}
