import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Report, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserResponse } from '../users/users.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear reporte de escasez (usuario autenticado)' })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({ status: 201, description: 'Reporte creado', type: ReportResponseDto })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async create(
    @CurrentUser() currentUser: UserResponse,
    @Body() dto: CreateReportDto,
  ): Promise<Report> {
    return this.reportsService.create(currentUser.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reportes (admin: todos; usuario: los propios)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWING', 'IN_PROGRESS', 'RESOLVED'] })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de reportes',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ReportResponseDto' } },
        total: { type: 'number' },
      },
    },
  })
  async findAll(
    @CurrentUser() currentUser: UserResponse,
    @Query() query: ReportQueryDto,
  ): Promise<{ data: Report[]; total: number }> {
    return this.reportsService.findAll(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener reporte por ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Reporte encontrado', type: ReportResponseDto })
  @ApiResponse({ status: 403, description: 'Sin acceso al reporte' })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserResponse,
  ): Promise<Report> {
    return this.reportsService.findOne(id, currentUser);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Cambiar estado del reporte (solo ADMIN / SUPERADMIN)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateReportStatusDto })
  @ApiResponse({ status: 200, description: 'Estado actualizado', type: ReportResponseDto })
  @ApiResponse({ status: 403, description: 'Solo ADMIN o SUPERADMIN' })
  @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
  ): Promise<Report> {
    return this.reportsService.updateStatus(id, dto);
  }
}
