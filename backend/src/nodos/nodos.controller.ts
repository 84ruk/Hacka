import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { NodosService } from './nodos.service';
import { EstadoNodo } from '../entities/nodo.entity';

@Controller('nodos')
export class NodosController {
  constructor(private readonly nodosService: NodosService) {}

  // GET /nodos/resumen  — debe ir ANTES de /:id para no ser capturado como id='resumen'
  @Get('resumen')
  getResumen() {
    return this.nodosService.getResumen();
  }

  // PATCH /nodos/sede/:sede/contener — antes de /:id
  @Patch('sede/:sede/contener')
  contenerSede(@Param('sede') sede: string) {
    return this.nodosService.contenerSede(sede);
  }

  // PATCH /nodos/sede/:sede/recuperar — antes de /:id
  @Patch('sede/:sede/recuperar')
  recuperarSede(@Param('sede') sede: string) {
    return this.nodosService.recuperarSede(sede);
  }

  @Get()
  findAll(
    @Query('estado') estado?: EstadoNodo,
    @Query('sede')   sede?: string,
  ) {
    return this.nodosService.findAll(estado, sede);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.nodosService.findOne(id);
  }

  @Patch(':id/contener')
  contener(@Param('id', ParseIntPipe) id: number) {
    return this.nodosService.contener(id);
  }

  @Patch(':id/recuperar')
  recuperar(@Param('id', ParseIntPipe) id: number) {
    return this.nodosService.recuperar(id);
  }

  @Patch(':id/proteger')
  proteger(@Param('id', ParseIntPipe) id: number) {
    return this.nodosService.proteger(id);
  }

  @Patch(':id/backup')
  generarBackup(@Param('id', ParseIntPipe) id: number) {
    return this.nodosService.generarBackup(id);
  }
}
