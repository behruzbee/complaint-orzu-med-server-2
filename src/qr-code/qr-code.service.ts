import { Injectable, Logger } from '@nestjs/common';
import { PatientsService } from 'src/patients/patients.service';
import { PatientStatus } from 'src/patients/entities/patient.entity';
import { Client, LocalAuth } from 'whatsapp-web.js';

@Injectable()
export class WhatsappAuthService {
  private readonly logger = new Logger(WhatsappAuthService.name);
  private client: Client | null = null;
  private qrCode: string | null = null;
  private isReady = false;
  private initializing = false;

  constructor(private readonly patientsService: PatientsService) {}

  /** 📌 Инициализация WhatsApp клиента */
  private async initClient() {
    if (this.client || this.initializing) return;

    this.initializing = true;
    this.client = new Client({
      authStrategy: new LocalAuth(),
      webVersionCache: { type: 'none' },
      puppeteer: {
        args: ['--no-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      this.isReady = false;
      this.logger.log('🔑 Новый QR-код получен');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('✅ WhatsApp клиент авторизован и готов');
    });

    this.client.on('disconnected', () => {
      this.logger.warn('⚠️ WhatsApp клиент отключен');
      this.client = null;
      this.qrCode = null;
      this.isReady = false;
    });

    await this.client.initialize();
    this.initializing = false;
  }

  /** 📌 Получение QR для фронта */
  async getQrCode(): Promise<{ qr: string | null; isReady: boolean }> {
    await this.initClient();
    return { qr: this.qrCode, isReady: this.isReady };
  }

  /** 📌 Отключение WhatsApp клиента */
  async disconnect(): Promise<{ disconnected: boolean }> {
    if (this.client) {
      try {
        await this.client.destroy();
        this.logger.log('🔌 WhatsApp клиент отключен вручную');
      } catch (e) {
        this.logger.error(`❌ Ошибка при отключении: ${e.message}`);
      }
    }
    this.client = null;
    this.qrCode = null;
    this.isReady = false;
    this.initializing = false;

    return { disconnected: true };
  }

  /** 🔄 Умная задержка */
  private async delay() {
    const ms = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
    this.logger.log(`⏳ Пауза ${ms / 1000} сек...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 📌 Отправить приветственное сообщение всем временным пациентам */
  async sendWelcomeMessages() {
    if (!this.client || !this.isReady) {
      throw new Error('❌ WhatsApp клиент не авторизован');
    }

    const patients = await this.patientsService.getPatientsByStatus(
      PatientStatus.NEW,
    );
    let processed = 0;

    const messageUz = `Ассалому алайкум, ҳурматли беморимиз! 🌸  
Мен – Orzu Medical клиникасидан Дурдона.  

Клиникамизга ташрифингиздан кейин ўзингизни қандай ҳис қиляпсиз?  
Биз кўрсатган хизматлар сизга маъқул бўлдими?  

Сизнинг фикрингиз биз учун жуда муҳим! 💙`;

    const messageKz = `Ассалаумағалейкум, құрметті қонағымыз! 🌸  
Мен – Orzu Medical клиникасынан Дурдона.  

Клиникамызға келгеннен кейін өзіңізді қалай сезініп жүрсіз?  
Біздің қызметіміз сізге ұнады ма?  

Сіздің пікіріңіз біз үшін өте маңызды! 💙`;

    for (const p of patients) {
      try {
        const chatId = `${p.phoneNumber}@c.us`;

        await this.client.sendMessage(chatId, messageUz);
        await this.delay();
        await this.client.sendMessage(chatId, messageKz);

        this.logger.log(`✅ Хабар юборилди: ${p.lastName} ${p.firstName}`);
        processed++;
      } catch (e) {
        this.logger.error(`❌ Хато: ${p.phoneNumber} → ${e.message}`);
      }

      await this.delay();
    }

    return { processed, total: patients.length };
  }
}
