import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerta } from '../entities/alerta.entity';
import { AccionProtocolo } from '../entities/accion-protocolo.entity';
import { Nodo } from '../entities/nodo.entity';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta, AccionProtocolo, Nodo])],
  providers: [TimelineService],
  controllers: [TimelineController],
})
export class TimelineModule {}
