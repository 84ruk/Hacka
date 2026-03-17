import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportSeverity, ReportStatus } from '@prisma/client';

export class ReportResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiPropertyOptional() address?: string | null;
  @ApiProperty({ enum: ReportSeverity }) severity!: ReportSeverity;
  @ApiProperty({ enum: ReportStatus }) status!: ReportStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
