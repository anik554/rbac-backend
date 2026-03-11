import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PermissionAtom } from '../common/enums/permission.enum';


@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions(PermissionAtom.DASHBOARD_VIEW)
  getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user);
  }
}
