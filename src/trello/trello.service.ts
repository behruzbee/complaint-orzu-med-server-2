import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TextMessageEntity } from 'src/bot/entities/text_message.entity';
import { VoiceMessageEntity } from 'src/bot/entities/voice_message.entity';
import { TrelloCardEntity } from './entities/trello.entity';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';

@Injectable()
export class TrelloService {
  private readonly logger = new Logger(TrelloService.name);
  private readonly key = process.env.TRELLO_KEY!;
  private readonly token = process.env.TRELLO_TOKEN!;
  private readonly boardId = process.env.TRELLO_BOARD_ID!;
  private readonly baseUrl = 'https://api.trello.com/1';

  constructor(
    @InjectRepository(TrelloCardEntity)
    private readonly trelloCardRepo: Repository<TrelloCardEntity>,

    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepo: Repository<FeedbackEntity>,

    @InjectRepository(TextMessageEntity)
    private readonly textRepo: Repository<TextMessageEntity>,

    @InjectRepository(VoiceMessageEntity)
    private readonly voiceRepo: Repository<VoiceMessageEntity>,
  ) {}

  private authParams() {
    return `key=${this.key}&token=${this.token}`;
  }

  // 1) Получаем списки доски — выбираем первый (порядок Trello)
  private async getBoardLists() {
    const url = `${this.baseUrl}/boards/${this.boardId}/lists?${this.authParams()}`;
    const res = await axios.get(url);
    return res.data; // массив списков
  }

  // 2) Ensure label exists on board — возвращаем id label
  private async ensureLabel(boardId: string, labelName: string) {
    // Получаем существующие метки
    const urlLabels = `${this.baseUrl}/boards/${boardId}/labels?${this.authParams()}`;
    const existing = (await axios.get(urlLabels)).data as any[];

    const found = existing.find(l => l.name === labelName);
    if (found) return found.id;

    // если не найдено — создаём (цвет можно выбрать или пустой)
    const createUrl = `${this.baseUrl}/labels?${this.authParams()}&idBoard=${boardId}&name=${encodeURIComponent(
      labelName,
    )}&color=blue`;
    const created = (await axios.post(createUrl)).data as any;
    return created.id;
  }

  // 3) Создать карточку для feedback (на первом листе)
  async createCardForFeedback(
  feedback: FeedbackEntity,
  branch: string,
  category: string
) {
  if (!feedback) {
    throw new BadRequestException('Feedback not found');
  }

  const lists = await this.getBoardLists();
  if (!lists?.length) {
    throw new InternalServerErrorException('No lists found on Trello board');
  }
  const firstList = lists[0];

  const labelId = await this.ensureLabel(this.boardId, branch);

  // Формируем описание по шаблону
  const patientName = `${feedback.firstName ?? ''} ${feedback.lastName ?? ''}`.trim() || 'Не указано';
  const phone = feedback.phoneNumber || 'Не указан';
  const status = feedback.status || 'Не указан';
  const createdDate = feedback.createdAt?.toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) || 'Не указана';

  const textMessages =
    feedback.messages?.length
      ? feedback.messages.map((m, i) => `${i + 1}. ${m.message}`).join('\n')
      : 'нет текста';

  const voiceMessages =
  feedback.voices?.length
    ? feedback.voices
        .map((voice, i) => `[🔊 Аудио ${i + 1}](${voice.url})`)
        .join('\n')
    : '';

  const description = [
    '📋 Жалоба от пациента',
    '',
    `👤 ФИО: ${patientName}`,
    `📞 Телефон: ${phone}`,
    `🏥 Филиал: ${branch}`,
    `📂 Категория: ${feedback.category}`,
    `🗂️ Статус: ${status}`,
    '',
    '📝 Текст:',
    textMessages,
    '',
    voiceMessages,
    '',
    `📅 Дата: ${createdDate}`,
  ]
    .filter(Boolean) // убираем пустые строки в конце
    .join('\n');

  const createCardUrl = `${this.baseUrl}/cards?${this.authParams()}`;

  try {
    const { data: createdCard } = await axios.post(createCardUrl, {
      idList: firstList.id,
      name: `${branch} — ${feedback.category}`,
      desc: description,
      idLabels: labelId,
    });

    const trelloCard = this.trelloCardRepo.create({
      trelloCardId: createdCard.id,
      listId: firstList.id,
      boardId: this.boardId,
      feedback,
    });
    await this.trelloCardRepo.save(trelloCard);

    this.logger.log(`✅ Trello card created: ${createdCard.id} for feedback ${feedback.id}`);
    return createdCard;
  } catch (error) {
    this.logger.error(`❌ Failed to create Trello card for feedback ${feedback.id}`, error);
    throw new InternalServerErrorException('Error while creating Trello card');
  }
}


  // 4) Воссоздать карту (restore) — используется, если webhook сообщает об удалении
  async recreateCardFromPayload(cardData: any) {
    // cardData можно получить из webhook action.data.card
    const name = cardData.name || 'Restored card';
    const desc = cardData.desc || `Restored: ${new Date().toISOString()}`;
    // пытаемся найти label по названию branch: невозможно по payload — оставляем без label
    const lists = await this.getBoardLists();
    const firstList = lists[0];

    const createCardUrl = `${this.baseUrl}/cards?${this.authParams()}&idList=${firstList.id}&name=${encodeURIComponent(
      name,
    )}&desc=${encodeURIComponent(desc)}`;
    const created = (await axios.post(createCardUrl)).data as any;

    // попытка связать с feedback по shortLink или name (если сохранял в описании feedbackId) — необязательно
    this.logger.log(`Trello card recreated: ${created.id}`);
    return created;
  }

  // 5) Обработка webhook payload от Trello
  async handleWebhook(payload: any) {
    const action = payload?.action;
    if (!action) return { ok: true };

    const type = action.type;
    this.logger.log(`Trello webhook action: ${type}`);

    try {
      if (type === 'updateCard') {
        const listAfter = action.data?.listAfter;
        const card = action.data?.card;
        if (listAfter && card) {
          // найти trelloCardEntity по trelloCardId
          const mapping = await this.trelloCardRepo.findOne({
            where: { trelloCardId: card.id },
            relations: ['feedback'],
          });
          // обновляем маппинг и статус feedback
          if (mapping) {
            mapping.listId = listAfter.id;
            await this.trelloCardRepo.save(mapping);

            // обновляем статус feedback на имя листа
            if (mapping.feedback) {
              mapping.feedback.status = listAfter.name;
              await this.feedbackRepo.save(mapping.feedback);
              this.logger.log(`Feedback ${mapping.feedback.id} status updated to ${listAfter.name}`);
            }
          }
        }
      } else if (type === 'deleteCard' || (type === 'removeCardFromBoard')) {
        // в webhook Trello может прислать экшн при удалении
        const card = action.data?.card;
        if (card) {
          // пробуем воссоздать карточку
          const recreated = await this.recreateCardFromPayload(card);
          // если у нас есть mapping — обновим его
          const mapping = await this.trelloCardRepo.findOne({ where: { trelloCardId: card.id } });
          if (mapping) {
            mapping.trelloCardId = recreated.id;
            mapping.listId = recreated.idList || mapping.listId;
            await this.trelloCardRepo.save(mapping);
            this.logger.log(`Mapping for feedback updated after recreate. new card: ${recreated.id}`);
          }
        }
      } else if (type === 'createCard') {
        // можно автоматически связать, если в описании есть feedbackId
        const card = action.data?.card;
        const desc = card?.desc || '';
        const m = desc.match(/feedbackId:([a-f0-9-]+)/i);
        if (m) {
          const feedbackId = m[1];
          const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
          if (feedback) {
            const mapping = this.trelloCardRepo.create({
              trelloCardId: card.id,
              listId: action.data.list?.id || null,
              boardId: this.boardId,
              feedback,
            });
            await this.trelloCardRepo.save(mapping);
            this.logger.log(`Created mapping for existing card ${card.id} -> feedback ${feedbackId}`);
          }
        }
      }
    } catch (err) {
      this.logger.error('Error handling Trello webhook', err);
    }

    return { ok: true };
  }

  // 6) Ручная функция: удалить (soft) и восстановить — в API Trello удаление обычно архивирует
  async restoreCardByFeedback(feedbackId: string) {
    const mapping = await this.trelloCardRepo.findOne({
      where: { feedback: { id: feedbackId } },
      relations: ['feedback'],
    });
    if (!mapping) throw new Error('Mapping not found');

    // Попробуем "unarchive" карточку: POST /1/cards/{idCard}/closed?value=false
    try {
      const url = `${this.baseUrl}/cards/${mapping.trelloCardId}?${this.authParams()}`;
      // получим карточку — если её нет, воссоздаём
      const resp = await axios.get(url);
      if (resp && resp.data) {
        // если карточка существует и closed=true => откроем
        if (resp.data.closed) {
          await axios.put(`${this.baseUrl}/cards/${mapping.trelloCardId}/closed?${this.authParams()}&value=false`);
          this.logger.log(`Card ${mapping.trelloCardId} unarchived`);
          return resp.data;
        }
        return resp.data;
      }
    } catch (err) {
      // если карточки нет - воссоздаём простую карточку
      const recreated = await this.recreateCardFromPayload({ name: `Restored for feedback ${feedbackId}`, desc: `feedbackId:${feedbackId}` });
      mapping.trelloCardId = recreated.id;
      mapping.listId = recreated.idList || mapping.listId;
      await this.trelloCardRepo.save(mapping);
      return recreated;
    }
  }
}
