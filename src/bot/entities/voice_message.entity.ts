import { Expose } from 'class-transformer';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

export enum BotVoiceMessageStatus {
  SAVED = 'saved', // окончательно сохранено
  TEMPORARY = 'temporary', // удалить позже
}

@Entity('voice_messages')
export class VoiceMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Номер отправителя (в международном формате)
  @Column({ length: 20 })
  sender: string;

  // ID медиа в WhatsApp (нужен для повторной загрузки)
  @Column({ nullable: true })
  mediaId: string;

  // Тип сообщения: audio, text, image и т.д.
  @Column({ length: 20 })
  messageType: string;

  // Формат аудио: ogg, mp3 и т.п.
  @Column({ length: 10, nullable: true })
  mimeType: string;

  // Размер файла в байтах
  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  // Длительность в секундах
  @Column({ type: 'int', nullable: true })
  duration: number;

  // Сам файл (в виде бинарных данных)
  @Column({ type: 'mediumblob', nullable: true })
  fileData: Buffer;

  // Статус хранения
  @Column({
    type: 'enum',
    enum: BotVoiceMessageStatus,
    default: BotVoiceMessageStatus.TEMPORARY,
  })
  status: BotVoiceMessageStatus;

  @ManyToOne(() => FeedbackEntity, (feedback) => feedback.voices, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  feedback: FeedbackEntity | null;

  @Expose()
  get url(): string {
    return `${process.env.API_BASE_URL}/message/voice/${this.id}/stream`;
  }

  @Column({ length: 10, nullable: true })
  voiceUrl: string;
  // Дата создания записи
  @CreateDateColumn()
  createdAt: Date;

  // Дата обновления статуса или данных
  @UpdateDateColumn()
  updatedAt: Date;
}
