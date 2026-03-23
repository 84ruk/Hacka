import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nodo } from '../entities/nodo.entity';
import { Alerta } from '../entities/alerta.entity';
import { NodosModule } from '../nodos/nodos.module';
import { AnalisisService } from './analisis.service';
import { AnalisisController } from './analisis.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Nodo, Alerta]), NodosModule],
  providers: [AnalisisService],
  controllers: [AnalisisController],
})
export class AnalisisModule {}
