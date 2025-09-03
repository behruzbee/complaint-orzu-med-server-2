import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

export enum BotTextMessageStatus {
  TEMPORARY = 'temporary', // временно сохранено
  SAVED = 'saved', // окончательно сохранено
}

@Entity('text_messages')
export class TextMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sender: string; // номер отправителя

  @Column({ type: 'text' })
  message: string; // текст сообщения

  @Column({
    type: 'enum',
    enum: BotTextMessageStatus,
    default: BotTextMessageStatus.TEMPORARY,
  })
  status: BotTextMessageStatus;

  @ManyToOne(() => FeedbackEntity, (feedback) => feedback.messages, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'feedbackId' })
  feedback: FeedbackEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
