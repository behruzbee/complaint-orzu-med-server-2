import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { PointEntity } from 'src/points/entities/points.entity';
import { TextMessageEntity } from 'src/bot/entities/text_message.entity';
import { VoiceMessageEntity } from 'src/bot/entities/voice_message.entity';
import { FeedbackCategory } from '../dto/create.dto';
import { PatientEntity } from 'src/patients/entities/patient.entity';

export enum FeedbackStatus {
  INCOMING = 'Поступившие жалобы',
  IN_PROGRESS = 'В работе',
  RESOLVED = 'Решено',
}

@Entity('feedbacks')
@Index(['phoneNumber'])
@Index(['createdAt'])
export class FeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'firstName' })
  firstName: string;

  @Column({ name: 'lastName' })
  lastName: string;

  @OneToMany(() => TextMessageEntity, (text) => text.feedback, {
    nullable: true,
    cascade: ['insert', 'update'],
  })
  messages?: TextMessageEntity[];

  @OneToMany(() => VoiceMessageEntity, (voice) => voice.feedback, {
    nullable: true,
    cascade: ['insert', 'update'],
  })
  voices?: VoiceMessageEntity[];

  @Column({ type: 'enum', enum: FeedbackCategory })
  category: FeedbackCategory;

  @Column({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.INCOMING })
  status: FeedbackStatus;

  @Column({ length: 20 })
  phoneNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.feedbacks, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  user: UserEntity | null;

  @ManyToOne(() => PatientEntity, (patient) => patient.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn()
  patient: PatientEntity;

  @OneToOne(() => PointEntity, (point) => point.feedback, { onDelete: 'SET NULL', nullable: true })
  point: PointEntity | null;
}