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
    this.logger.log('🚀 Запуск WhatsApp клиента...');

    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
      webVersionCache: { type: 'none' },
    });

    this.client.on('qr', (qr) => {
      this.qrCode = qr; // можно конвертировать через qrcode.toDataURL если нужен Base64
      this.isReady = false;
      this.logger.log('🔑 Новый QR-код получен');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('✅ WhatsApp клиент авторизован и готов');
    });

    // Игнорируем отключение, чтобы клиент не удалялся
    this.client.on('disconnected', (reason) => {
      this.logger.warn(
        `⚠️ Клиент получил disconnected: ${reason}, но мы игнорируем`,
      );
      // Не удаляем this.client, не сбрасываем QR, не меняем isReady
    });

    try {
      await this.client.initialize();
    } catch (e) {
      this.logger.error(`❌ Ошибка инициализации: ${e.message}`);
      this.client = null;
    } finally {
      this.initializing = false;
    }
  }

  /** 🔄 Попробовать переподключение */
  private async reconnect() {
    await new Promise((res) => setTimeout(res, 5000)); // пауза 5 сек
    this.logger.log('🔄 Переподключение WhatsApp клиента...');
    await this.initClient();
  }

  /** 📌 Получение QR для фронта */
  async getQrCode(): Promise<{ qr: string | null; isReady: boolean }> {
    if (!this.client && !this.initializing) {
      await this.initClient();
    }
    return { qr: this.qrCode, isReady: this.isReady };
  }

  /** 📌 Отключение WhatsApp клиента вручную */
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

  /** 🔄 Умная задержка (между сообщениями) */
  private async delay() {
    const ms = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
    this.logger.log(`⏳ Пауза ${ms / 1000} сек...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 📌 Определение языка по номеру */
  private getMessageByPhone(phone: string): string {
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

    const messageRu = `Здравствуйте, уважаемый пациент! 🌸  
Я – Дурдона из клиники Orzu Medical.  

Как вы себя чувствуете после посещения нашей клиники?  
Вам понравилось качество наших услуг?  

Ваше мнение очень важно для нас! 💙`;

    if (phone.startsWith('998')) {
      return messageUz;
    } else if (phone.startsWith('7') || phone.startsWith('8')) {
      return messageKz;
    } else {
      return messageRu;
    }
  }

  /** 📌 Отправить приветственное сообщение всем новым пациентам */
  async sendWelcomeMessages() {
    if (!this.client || !this.isReady) {
      throw new Error('❌ WhatsApp клиент не авторизован');
    }

    const patients = await this.patientsService.getPatientsByStatus(
      PatientStatus.NEW,
    );
    let processed = 0;

    for (const p of patients) {
      try {
        if (!this.client) return;
        const chatId = `${p.phoneNumber}@c.us`;

        const message = this.getMessageByPhone(p.phoneNumber);

        await this.client.sendMessage(chatId, message);

        this.logger.log(
          `✅ Сообщение отправлено: ${p.lastName} ${p.firstName}`,
        );
        processed++;
      } catch (e) {
        this.logger.error(`❌ Ошибка: ${p.phoneNumber} → ${e.message}`);
      }

      await this.delay();
    }

    return { processed, total: patients.length };
  }
}
