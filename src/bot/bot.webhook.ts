import { Controller, Get, Post, Query, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BotService } from './services/bot.service';

@Controller('webhook/whatsapp')
export class BotWebhookController {
  constructor(private readonly botService: BotService) {}

  /**
   * Проверка вебхука (GET-запрос от Meta)
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_ACCESS_TOKEN) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.sendStatus(HttpStatus.FORBIDDEN);
  }

  /**
   * Приём событий (POST-запрос от Meta)
   */
  @Post()
  async handleIncomingMessage(@Req() req: Request, @Res() res: Response) {
    const body = req.body;
    if (!body.object) return res.sendStatus(HttpStatus.NOT_FOUND);

    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (messages?.length) {
      await this.botService.handleIncomingMessage(messages[0]);
    }

    return res.sendStatus(HttpStatus.OK);
  }
}
