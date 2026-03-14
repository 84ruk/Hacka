import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Esquema Swagger para respuestas de usuario (sin campos sensibles).
 */
export class UserResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiProperty({ enum: ['SUPERADMIN', 'ADMIN', 'USER'] })
  role!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  status!: string;

  @ApiPropertyOptional()
  tenantId?: string | null;

  @ApiPropertyOptional()
  lastLoginAt?: Date | null;

  @ApiPropertyOptional()
  emailVerifiedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
