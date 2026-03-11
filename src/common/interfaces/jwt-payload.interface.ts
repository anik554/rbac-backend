import { RoleType } from '../enums/role.enum';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: RoleType;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: RoleType;
  permissions: string[];
}
