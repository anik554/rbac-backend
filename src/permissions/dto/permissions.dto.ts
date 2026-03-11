import { IsArray, IsString, IsUUID } from 'class-validator';

export class GrantPermissionsDto {
  /** The target user to grant/revoke permissions for */
  @IsUUID()
  targetUserId: string;

  /** Array of permission atoms to grant */
  @IsArray()
  @IsString({ each: true })
  atoms: string[];
}

export class RevokePermissionsDto {
  @IsUUID()
  targetUserId: string;

  @IsArray()
  @IsString({ each: true })
  atoms: string[];
}

export class SetUserPermissionsDto {
  /** Replace all extra permissions for a user with this set */
  @IsArray()
  @IsString({ each: true })
  atoms: string[];
}
