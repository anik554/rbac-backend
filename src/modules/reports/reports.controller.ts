import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionAtom } from '../../common/enums/permission.enum';


@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('summary')
  @RequirePermissions(PermissionAtom.REPORTS_VIEW)
  getSummary(@CurrentUser() user: any) {
    return this.reportsService.getSummary(user);
  }
}
