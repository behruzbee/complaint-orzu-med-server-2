import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  VoiceMessageEntity,
  BotVoiceMessageStatus,
} from '../entities/voice_message.entity';
import {
  TextMessageEntity,
  BotTextMessageStatus,
} from '../entities/text_message.entity';
import { MediaService } from './media.service';
import { PatientsService } from 'src/patients/patients.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly senderPhoneId = process.env.WHATSAPP_SENDER_PHONE_ID;

  constructor(
    @InjectRepository(VoiceMessageEntity)
    private readonly voiceRepo: Repository<VoiceMessageEntity>,

    @InjectRepository(TextMessageEntity)
    private readonly textRepo: Repository<TextMessageEntity>,

    private readonly mediaService: MediaService,
    private readonly patientsService: PatientsService,
  ) {}

  async handleIncomingMessage(message: any) {
    const from = message.from;

    if (message.type === 'audio') {
      await this.sendTextMessage(
        from,
        '📥 Голосовое сообщение получено и сохраняется.',
      );
      await this.processAudioMessage(message, from);

    } else if (message.type === 'text') {
      await this.processTextMessage(message, from);

    } else if (message.type === 'document') {
      const mimeType = message.document.mime_type || '';
      const fileName = message.document.filename || '';

      if (
        mimeType.includes('spreadsheet') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.xlsx')
      ) {
        await this.sendTextMessage(from, '📥 Получен Excel-файл. Начинаю импорт пациентов...');

        try {
          const mediaUrl = await this.mediaService.getMediaUrl(message.document.id);
          const { buffer } = await this.mediaService.downloadMediaBuffer(mediaUrl);

          const result = await this.patientsService.importFromExcel(buffer);
          await this.sendTextMessage(from, `✅ Импортировано пациентов: ${result.imported}`);
        } catch (err) {
          await this.sendTextMessage(from, `❌ Ошибка при импорте: ${err.message}`);
        }
      } else {
        await this.sendTextMessage(from, '⚠️ Файл не распознан как Excel.');
      }
    }
  }

  private async processTextMessage(message: any, from: string) {
    const textBody = message.text.body;
    this.logger.log(`💬 Текст от ${from}: ${textBody}`);

    try {
      await this.textRepo.save(
        this.textRepo.create({
          sender: from,
          message: textBody,
          status: BotTextMessageStatus.TEMPORARY,
        }),
      );
      await this.sendTextMessage(from, '✅ Сообщение получено и сохранено.');
      this.logger.log(`💾 Текстовое сообщение сохранено.`);
    } catch (err) {
      this.logger.error(`❌ Ошибка сохранения текста: ${err.message}`);
    }
  }

  private async processAudioMessage(message: any, from: string) {
    const mediaId = message.audio.id;
    const duration = message.audio.duration || null;

    this.logger.log(`🎙️ Голосовое сообщение от ${from}, mediaId=${mediaId}`);

    try {
      const mediaUrl = await this.mediaService.getMediaUrl(mediaId);
      const { buffer, size, mimeType } =
        await this.mediaService.downloadMediaBuffer(mediaUrl);

      await this.voiceRepo.save(
        this.voiceRepo.create({
          mediaId,
          sender: from,
          messageType: 'audio',
          mimeType,
          fileSize: size,
          duration,
          fileData: buffer,
          voiceUrl: `${process.env.API_BASE_URL}/message/voice/${mediaId}/stream`,
          status: BotVoiceMessageStatus.TEMPORARY,
        }),
      );

      await this.sendTextMessage(from, '💾 Голосовое сообщение сохранено.');
      this.logger.log(`✅ Голосовое сообщение сохранено в БД (${size} bytes)`);
    } catch (err) {
      this.logger.error(`❌ Ошибка обработки аудио: ${err.message}`);
    }
  }

  private async sendTextMessage(to: string, text: string) {
    const url = `https://graph.facebook.com/v22.0/${this.senderPhoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    };

    try {
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_WEBHOOK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(
        `📤 Сообщение отправлено: ${to} → ${JSON.stringify(res.data)}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Ошибка отправки сообщения: ${error.response?.status} ${JSON.stringify(error.response?.data)}`,
      );
    }
  }
}
