import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  Logger,
  Get,
  Res,
  Req,
} from '@nestjs/common';
import { TrelloService } from './trello.service';
import type { Request, Response } from 'express';

@Controller('webhook/trello')
export class TrelloController {
  private readonly logger = new Logger(TrelloController.name);

  constructor(private readonly trelloService: TrelloService) {}

  @Get()
  @HttpCode(200)
  handleVerification(@Req() req: Request, @Res() res: Response) {
    this.logger.log('Trello webhook verification GET request');
    return res.send('OK');
  }

  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    this.logger.log('Trello webhook received');
    return await this.trelloService.handleWebhook(body);
  }
}
