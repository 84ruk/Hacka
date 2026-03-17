import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportSeverity } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: 'Sin agua en colonia norte' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Llevo 3 días sin suministro de agua.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 19.432608 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -99.133209 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ example: 'Av. Insurgentes 123, CDMX' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ enum: ReportSeverity, example: ReportSeverity.HIGH })
  @IsEnum(ReportSeverity)
  severity!: ReportSeverity;
}
