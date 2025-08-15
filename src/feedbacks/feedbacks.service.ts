import { Injectable, NotFoundException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedbackEntity } from './entities/feedback.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { CreateFeedbackDto } from './dto/create.dto';
import { TrelloService } from 'src/trello/trello.service';
import {
  TextMessageEntity,
  BotTextMessageStatus,
} from 'src/bot/entities/text_message.entity';
import {
  VoiceMessageEntity,
  BotVoiceMessageStatus,
} from 'src/bot/entities/voice_message.entity';
import {
  PatientEntity,
  PatientStatus,
} from 'src/patients/entities/patient.entity';
import { PatientsService } from 'src/patients/patients.service';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepository: Repository<FeedbackEntity>,
    private readonly trelloService: TrelloService,
  ) {}

  async createFeedback(
    dto: CreateFeedbackDto,
    userId: string,
    branch: string,
    category: string,
  ): Promise<FeedbackEntity> {
    return await this.feedbackRepository.manager.transaction(async (em) => {
      const user = await em.findOne(UserEntity, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }

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

      // Ищем пациента
      let patient = await em.findOne(PatientEntity, {
        where: { phoneNumber: dto.phoneNumber, status: PatientStatus.REGULAR },
      });

      // Если не нашли по номеру — ищем по ФИО
      if (!patient) {
        patient = await em.findOne(PatientEntity, {
          where: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            status: PatientStatus.REGULAR,
          },
        });
      }

      if (!patient) {
        patient = em.create(PatientEntity, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber,
          branch: branch,
          status: PatientStatus.REGULAR,
        });
        await em.save(patient);
      }

      const feedback = this.feedbackRepository.create({
        ...dto,
        user,
        messages: tempTexts,
        voices: tempVoices,
        patient,
        phoneNumber: dto.phoneNumber,
        status: 'Поступившие жалобы',
      });

      await em.save(feedback);

      // Обновляем статусы сообщений
      for (const text of tempTexts) {
        text.status = BotTextMessageStatus.SAVED;
        text.feedback = feedback;
      }
      await em.save(tempTexts);

      for (const voice of tempVoices) {
        voice.status = BotVoiceMessageStatus.SAVED;
        voice.feedback = feedback;
      }
      await em.save(tempVoices);

      setImmediate(() => {
        this.trelloService
          .createCardForFeedback(feedback, branch, category)
          .catch((err) => {
            console.error(err);
          });
      });

      return feedback;
    });
  }
}
