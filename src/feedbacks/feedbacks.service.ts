import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { FeedbackEntity, FeedbackStatus } from './entities/feedback.entity';
import { CreateFeedbackDto, FeedbackCategory } from './dto/create.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { TextMessageEntity } from 'src/bot/entities/text_message.entity';
import { VoiceMessageEntity } from 'src/bot/entities/voice_message.entity';
import { BotTextMessageStatus } from 'src/bot/entities/text_message.entity';
import { BotVoiceMessageStatus } from 'src/bot/entities/voice_message.entity';
import { PatientEntity } from 'src/patients/entities/patient.entity';
import { TrelloService } from 'src/trello/trello.service';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepository: Repository<FeedbackEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly trelloService: TrelloService,
  ) {}

  async createFeedback(
    dto: CreateFeedbackDto,
    userId: string,
    branch: string,
    manager?: EntityManager,
  ): Promise<FeedbackEntity> {
    const em = manager ?? this.dataSource.manager;

    const user = await em.findOne(UserEntity, { where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const { phoneNumber } = dto;

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

    const patient = await em.findOne(PatientEntity, { where: { phoneNumber } });
    if (!patient) throw new NotFoundException('Пациент не найден');

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

    for (const text of tempTexts) {
      text.status = BotTextMessageStatus.SAVED;
      text.feedback = feedback;
    }
    if (tempTexts.length) await em.save(tempTexts);

    for (const voice of tempVoices) {
      voice.status = BotVoiceMessageStatus.SAVED;
      voice.feedback = feedback;
    }
    if (tempVoices.length) await em.save(tempVoices);

    this.trelloService.createCardForFeedback(
      feedback,
      branch,
      feedback.category,
    );

    return feedback;
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
