import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service.js';

@Controller('webhook')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verified = this.whatsapp.verifyWebhook(mode, verifyToken, challenge);
    if (verified !== null) {
      return res.status(HttpStatus.OK).send(verified);
    }
    return res.sendStatus(HttpStatus.FORBIDDEN);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  handleIncoming(@Body() body: any) {
    // Meta necesita 200 OK inmediato; el procesamiento se delega al servicio
    void this.whatsapp.handleIncomingMessage(body);
    return 'OK';
  }
}
