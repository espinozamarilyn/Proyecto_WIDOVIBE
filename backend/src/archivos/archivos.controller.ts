import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, createReadStream } from 'fs';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArchivosService } from './archivos.service';

const carpetaUploads = join(process.cwd(), 'uploads');

mkdirSync(carpetaUploads, { recursive: true });

const tiposPermitidos: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

@Controller('archivos')
@UseGuards(JwtAuthGuard)
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post('mensaje/:mensajeId')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          callback(null, carpetaUploads);
        },
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const mimePermitido = tiposPermitidos[extension];

        if (!mimePermitido || mimePermitido !== file.mimetype) {
          return callback(
            new BadRequestException('Formato de archivo no permitido'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  subir(
    @Req() req: any,
    @Param('mensajeId') mensajeId: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.archivosService.crear(
      req.user.id,
      mensajeId,
      archivo,
    );
  }

  @Get('mensaje/:mensajeId')
  listar(
    @Req() req: any,
    @Param('mensajeId') mensajeId: string,
  ) {
    return this.archivosService.listarPorMensaje(
      req.user.id,
      mensajeId,
    );
  }

  @Get(':id/descargar')
  async descargar(
    @Req() req: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const archivo =
      await this.archivosService.obtenerParaDescargar(
        req.user.id,
        id,
      );

    const nombreSeguro = encodeURIComponent(
      archivo.nombre_original,
    );

    res.set({
      'Content-Type': archivo.tipo_mime,
      'Content-Disposition': `attachment; filename*=UTF-8''${nombreSeguro}`,
      'Content-Length': archivo.tamano_bytes.toString(),
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(
      createReadStream(archivo.ruta_archivo),
    );
  }

  @Delete(':id')
  eliminar(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.archivosService.eliminar(req.user.id, id);
  }
}