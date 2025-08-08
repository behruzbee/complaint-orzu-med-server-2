import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  ManyToMany,
  JoinTable,
  PrimaryGeneratedColumn,
  OneToOne,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { PointEntity } from 'src/points/entities/points.entity';

export enum FeedbackCategory {
  COMPLAINT = 'complaint',
  SUGGESTION = 'suggestion',
}

// Филиалы
export enum Branches {
  CHINOZ = 'ЧИНОЗ',
  YUNUSABAD = 'ЮНУСАБАД',
  OQQURGHON = 'ОККУРГОН',
  YANGIBOZOR = 'ЯНГИ БОЗОР',
  ZANGIOTA = 'ЗАНГИОТА',
  PARKENT = 'ПАРКЕНТ',
  FOTIMA_SULTON = 'ФОТИМА-СУЛТОН',
}

@Entity('feedbacks')
export class FeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ name: 'voice_url', nullable: true })
  voiceUrl?: string;

  @Column({
    type: 'enum',
    enum: FeedbackCategory,
  })
  category: FeedbackCategory;

  @Column({
    type: 'enum',
    enum: Branches,
  })
  branch: Branches;

  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.feedbacks, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @OneToOne(() => PointEntity, (point) => point.feedback, {
    cascade: true,
  })
  point: PointEntity;
}
