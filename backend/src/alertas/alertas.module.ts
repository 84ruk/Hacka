import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerta } from '../entities/alerta.entity';
import { AlertasService } from './alertas.service';
import { AlertasController } from './alertas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta])],
  providers: [AlertasService],
  controllers: [AlertasController],
})
export class AlertasModule {}
