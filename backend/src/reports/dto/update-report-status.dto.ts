import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.IN_PROGRESS })
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}
