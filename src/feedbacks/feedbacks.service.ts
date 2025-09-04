import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { FeedbackEntity, FeedbackStatus } from './entities/feedback.entity';
import { CreateFeedbackDto, FeedbackCategory } from './dto/create.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { TextMessageEntity } from 'src/bot/entities/text_message.entity';
import { VoiceMessageEntity } from 'src/bot/entities/voice_message.entity';
import { BotTextMessageStatus } from 'src/bot/entities/text_message.entity';
import { BotVoiceMessageStatus } from 'src/bot/entities/voice_message.entity';
import {
  PatientEntity,
  PatientStatus,
} from 'src/patients/entities/patient.entity';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepository: Repository<FeedbackEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async createFeedback(
    dto: CreateFeedbackDto,
    userId: string,
    branch: string,
  ): Promise<FeedbackEntity> {
    return await this.dataSource.transaction(async (em) => {
      const user = await em.findOne(UserEntity, { where: { id: userId } });
      if (!user) throw new NotFoundException('Пользователь не найден');

      const { phoneNumber } = dto;

      // 1. Забираем временные сообщения
      const tempTexts = dto.textsIds?.length
        ? await em.find(TextMessageEntity, {
            where: {
              status: BotTextMessageStatus.TEMPORARY,
              id: In(dto.textsIds),
            },
          })
        : [];
      const tempVoices = dto.voiceIds?.length
        ? await em.find(VoiceMessageEntity, {
            where: {
              status: BotVoiceMessageStatus.TEMPORARY,
              id: In(dto.voiceIds),
            },
          })
        : [];

      if (tempTexts.length === 0 && tempVoices.length === 0) {
        throw new NotFoundException(
          'Нет временных сообщений для создания обратной связи',
        );
      }

      // 2. Upsert пациента
      let patient = await em.findOne(PatientEntity, {
        where: { phoneNumber },
      });

      if (!patient) {
        // Новый пациент
        patient = em.create(PatientEntity, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber,
          branch,
          status: PatientStatus.REGULAR,
        });
        await em.save(patient);
      } else {
        patient = em.create(PatientEntity, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber,
          branch,
          status: PatientStatus.REGULAR,
        });

        await em.upsert(PatientEntity, patient, ['phoneNumber']);
      }

      // 3. Создаём обратную связь
      const feedback = em.create(FeedbackEntity, {
        ...dto,
        user,
        messages: tempTexts,
        voices: tempVoices,
        patient,
        phoneNumber,
        status: FeedbackStatus.INCOMING,
        category: dto.category,
      });
      await em.save(feedback);

      // 4. Привязываем сообщения к feedback
      if (tempTexts.length) {
        for (const text of tempTexts) {
          text.status = BotTextMessageStatus.SAVED;
          text.feedback = feedback;
        }
        await em.save(tempTexts);
      }

      if (tempVoices.length) {
        for (const voice of tempVoices) {
          voice.status = BotVoiceMessageStatus.SAVED;
          voice.feedback = feedback;
        }
        await em.save(tempVoices);
      }

      // 🔄 Можно подключить интеграции после коммита
      setImmediate(() => {
        // this.trelloService?.createCardForFeedback(feedback, branch, dto.category).catch(console.error);
      });

      return feedback;
    });
  }

  async findAll(): Promise<FeedbackEntity[]> {
    return this.feedbackRepository.find({
      relations: ['user', 'patient', 'messages', 'voices'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPhone(phone: string): Promise<FeedbackEntity[]> {
    return this.feedbackRepository.find({
      where: { phoneNumber: phone },
      relations: ['user', 'patient', 'messages', 'voices'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<FeedbackEntity[]> {
    return this.feedbackRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'patient', 'messages', 'voices'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: FeedbackCategory): Promise<FeedbackEntity[]> {
    return this.feedbackRepository.find({
      where: { category: status },
      relations: ['user', 'patient', 'messages', 'voices'],
      order: { createdAt: 'DESC' },
    });
  }
}
