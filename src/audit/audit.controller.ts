import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditFilterDto, AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators';
import { PermissionAtom } from '../common/enums/permission.enum';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  /** GET /audit — paginated, filterable audit log */
  @Get()
  @RequirePermissions(PermissionAtom.AUDIT_VIEW)
  findAll(@Query() filters: AuditFilterDto) {
    return this.auditService.findAll(filters);
  }
}
