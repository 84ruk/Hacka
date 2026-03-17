import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Report, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponse } from '../users/users.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(user: UserResponse): boolean {
    return user.role === Role.ADMIN || user.role === Role.SUPERADMIN;
  }

  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    return this.prisma.report.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        severity: dto.severity,
      },
    });
  }

  async findAll(
    query: ReportQueryDto,
    currentUser: UserResponse,
  ): Promise<{ data: Report[]; total: number }> {
    const { status, severity, page = 1, limit = 10 } = query;

    const where = {
      ...(status && { status }),
      ...(severity && { severity }),
      ...(!this.isAdmin(currentUser) && { userId: currentUser.id }),
    };

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, currentUser: UserResponse): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (!this.isAdmin(currentUser) && report.userId !== currentUser.id) {
      throw new ForbiddenException('Access denied');
    }
    return report;
  }

  async updateStatus(id: string, dto: UpdateReportStatusDto): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return this.prisma.report.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
