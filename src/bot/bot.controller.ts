import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Delete,
  NotFoundException,
  UseGuards,
  Res,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BotVoiceMessageStatus,
  VoiceMessageEntity,
} from './entities/voice_message.entity';
import {
  BotTextMessageStatus,
  TextMessageEntity,
} from './entities/text_message.entity';
import { BotService } from './services/bot.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CheckRoles } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/enums/roles.enum';
import { type Response } from 'express';

@Controller('message')
@UseGuards(RolesGuard)
export class MessageController {
  constructor(
    @InjectRepository(VoiceMessageEntity)
    private readonly voiceRepo: Repository<VoiceMessageEntity>,

    @InjectRepository(TextMessageEntity)
    private readonly textRepo: Repository<TextMessageEntity>,

    private readonly botService: BotService,
  ) {}

  @Get('voice')
  @CheckRoles(Roles.Admin, Roles.User)
  async getTemporaryVoiceMessages() {
    return await this.voiceRepo.find({
      where: { status: BotVoiceMessageStatus.TEMPORARY },
      order: { createdAt: 'DESC' },
    });
  }

  @Get('voice/:id')
  @CheckRoles(Roles.Admin, Roles.User)
  async getVoiceMessage(@Param('id') id: string) {
    const message = await this.voiceRepo.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Голосовое сообщение с id=${id} не найдено`);
    }
    return message;
  }

  @Get('text')
  @CheckRoles(Roles.Admin, Roles.User)
  async getAllTextMessages() {
    return await this.textRepo.find({
      where: { status: BotTextMessageStatus.TEMPORARY },
      order: { createdAt: 'DESC' },
    });
  }

  @Post('send-text')
  @CheckRoles(Roles.Admin)
  async sendText(@Body() body: { to: string; text: string }) {
    return await this.botService['sendTextMessage'](body.to, body.text);
  }

  @Delete('voice/:id')
  @CheckRoles(Roles.Admin)
  async deleteVoice(@Param('id') id: number) {
    const result = await this.voiceRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Голосовое сообщение с id=${id} не найдено`);
    }
    return { success: true };
  }

  @Delete('voice/temporary/all')
  @CheckRoles(Roles.Admin)
  async deleteAllTemporaryVoices() {
    const result = await this.voiceRepo.delete({
      status: BotVoiceMessageStatus.TEMPORARY,
    });
    return {
      success: true,
      deletedCount: result.affected || 0,
    };
  }

  @Get('voice/:id/stream')
  async streamVoice(@Param('id') id: string, @Res() res: Response) {
    let message = await this.voiceRepo.findOne({ where: { id } });
    if (!message) {
      message = await this.voiceRepo.findOne({ where: { mediaId: id } });
    }

    if (!message || !message.fileData) {
      throw new NotFoundException(`Голосовое сообщение с id=${id} не найдено`);
    }

    res.setHeader('Content-Type', message.mimeType || 'audio/ogg');
    res.send(message.fileData);
  }

  @Delete('text/:id')
  @CheckRoles(Roles.Admin)
  async deleteText(@Param('id') id: number) {
    const result = await this.textRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Текстовое сообщение с id=${id} не найдено`);
    }
    return { success: true };
  }

  @Delete('text/temporary/all')
  @CheckRoles(Roles.Admin)
  async deleteAllTemporaryTexts() {
    const result = await this.textRepo.delete({
      status: BotTextMessageStatus.TEMPORARY,
    });
    return {
      success: true,
      deletedCount: result.affected || 0,
    };
  }
}
