import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { PointEntity } from 'src/points/entities/points.entity';
import { TextMessageEntity } from 'src/bot/entities/text_message.entity';
import { VoiceMessageEntity } from 'src/bot/entities/voice_message.entity';
import { FeedbackCategory } from '../dto/create.dto';
import { PatientEntity } from 'src/patients/entities/patient.entity';

@Entity('feedbacks')
export class FeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'firstName' })
  firstName: string;

  @Column({ name: 'lastName' })
  lastName: string;

  @OneToMany(() => TextMessageEntity, (text) => text.feedback, {
    nullable: true,
    cascade: true,
  })
  messages?: TextMessageEntity[];

  @OneToMany(() => VoiceMessageEntity, (voice) => voice.feedback, {
    nullable: true,
    cascade: true,
  })
  voices?: VoiceMessageEntity[];

  @Column({
    type: 'enum',
    enum: FeedbackCategory,
  })
  category: FeedbackCategory;

  @Column({ name: 'status' })
  status: string;

  @Column({ length: 20, nullable: true })
  passport?: string;

  @Column({ length: 20 })
  phoneNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.feedbacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: UserEntity;

  @ManyToOne(() => PatientEntity, (patient) => patient.feedbacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  patient: PatientEntity;

  @OneToOne(() => PointEntity, (point) => point.feedback, {
    onDelete: 'CASCADE',
  })
  point: PointEntity;
}
