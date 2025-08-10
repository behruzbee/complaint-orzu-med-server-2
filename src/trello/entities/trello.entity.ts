import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('trello_cards')
export class TrelloCardEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trello_card_id', unique: true })
  trelloCardId: string;

  @Column({ name: 'list_id', nullable: true })
  listId: string;

  @Column({ name: 'board_id', nullable: true })
  boardId: string;

  @ManyToOne(() => FeedbackEntity)
  @JoinColumn({ name: 'feedback_id' })
  feedback: FeedbackEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
