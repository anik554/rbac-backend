/**
 * Permission atoms — every page/action is gated by exactly one atom.
 * Format: resource.action
 */
export enum PermissionAtom {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard.view',

  // User Management
  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_EDIT = 'users.edit',
  USERS_SUSPEND = 'users.suspend',
  USERS_BAN = 'users.ban',
  USERS_DELETE = 'users.delete',

  // Roles & Permissions
  PERMISSIONS_VIEW = 'permissions.view',
  PERMISSIONS_MANAGE = 'permissions.manage',

  // Leads
  LEADS_VIEW = 'leads.view',
  LEADS_CREATE = 'leads.create',
  LEADS_EDIT = 'leads.edit',
  LEADS_DELETE = 'leads.delete',

  // Tasks
  TASKS_VIEW = 'tasks.view',
  TASKS_CREATE = 'tasks.create',
  TASKS_EDIT = 'tasks.edit',
  TASKS_DELETE = 'tasks.delete',

  // Reports
  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',

  // Audit Log
  AUDIT_VIEW = 'audit.view',

  // Customer Portal
  CUSTOMER_PORTAL_VIEW = 'customer_portal.view',

  // Settings
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_EDIT = 'settings.edit',
}

/** Default permission sets per role (applied on user creation) */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionAtom[]> = {
  admin: Object.values(PermissionAtom), // Admin gets everything
  manager: [
    PermissionAtom.DASHBOARD_VIEW,
    PermissionAtom.USERS_VIEW,
    PermissionAtom.USERS_CREATE,
    PermissionAtom.USERS_EDIT,
    PermissionAtom.USERS_SUSPEND,
    PermissionAtom.USERS_BAN,
    PermissionAtom.PERMISSIONS_VIEW,
    PermissionAtom.PERMISSIONS_MANAGE,
    PermissionAtom.LEADS_VIEW,
    PermissionAtom.LEADS_CREATE,
    PermissionAtom.LEADS_EDIT,
    PermissionAtom.LEADS_DELETE,
    PermissionAtom.TASKS_VIEW,
    PermissionAtom.TASKS_CREATE,
    PermissionAtom.TASKS_EDIT,
    PermissionAtom.TASKS_DELETE,
    PermissionAtom.REPORTS_VIEW,
    PermissionAtom.REPORTS_EXPORT,
    PermissionAtom.AUDIT_VIEW,
    PermissionAtom.SETTINGS_VIEW,
  ],
  agent: [
    PermissionAtom.DASHBOARD_VIEW,
    PermissionAtom.LEADS_VIEW,
    PermissionAtom.TASKS_VIEW,
    PermissionAtom.TASKS_CREATE,
    PermissionAtom.TASKS_EDIT,
  ],
  customer: [PermissionAtom.CUSTOMER_PORTAL_VIEW],
};
