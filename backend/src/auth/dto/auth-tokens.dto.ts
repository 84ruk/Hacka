import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Esquema Swagger para respuesta de refresh token.
 */
export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiPropertyOptional()
  expiresIn?: number;
}
