import { Controller, Get, Post } from '@nestjs/common';
import { WhatsappAuthService } from './qr-code.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappAuthService: WhatsappAuthService) {}

  /** 📌 Получение QR-кода для авторизации */
  @Get('qr')
  async getQrCode() {
    return this.whatsappAuthService.getQrCode();
  }

  /** 📌 Ручное отключение WhatsApp клиента */
  @Post('disconnect')
  async disconnect() {
    return this.whatsappAuthService.disconnect();
  }

  /** 📌 Рассылка приветственных сообщений */
  @Post('send-welcome')
  async sendWelcome() {
    return this.whatsappAuthService.sendWelcomeMessages();
  }
}
