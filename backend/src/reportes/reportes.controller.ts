import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportesService } from './reportes.service';
import { CrearReporteDto } from './dto/crear-reporte.dto';
import { ActualizarReporteDto } from './dto/actualizar-reporte.dto';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  crear(@Req() req: any, @Body() datos: CrearReporteDto) {
    return this.reportesService.crear(req.user.id, datos);
  }

  @Get('mios')
  listarMios(@Req() req: any) {
    return this.reportesService.listarMios(req.user.id);
  }

  @Get()
  listarTodos(@Req() req: any) {
    return this.reportesService.listarTodos(req.user.id);
  }

  @Patch(':id')
  actualizar(
    @Req() req: any,
    @Param('id') id: string,
    @Body() datos: ActualizarReporteDto,
  ) {
    return this.reportesService.actualizar(
      req.user.id,
      id,
      datos,
    );
  }
}