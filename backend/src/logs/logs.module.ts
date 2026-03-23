import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogForense } from '../entities/log-forense.entity';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([LogForense])],
  providers:   [LogsService],
  controllers: [LogsController],
  exports:     [LogsService],
})
export class LogsModule {}
