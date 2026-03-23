import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nodo } from '../entities/nodo.entity';
import { AccionProtocolo } from '../entities/accion-protocolo.entity';
import { NodosService } from './nodos.service';
import { NodosController } from './nodos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Nodo, AccionProtocolo])],
  providers: [NodosService],
  controllers: [NodosController],
  exports: [NodosService],
})
export class NodosModule {}
