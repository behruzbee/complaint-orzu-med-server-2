import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { TargetName, PointValue, Branches } from '../dto/create.dto';
import { PatientEntity } from 'src/patients/entities/patient.entity';

@Entity('points')
@Index(['createdAt'])
@Index(['category', 'branch'])
export class PointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TargetName })
  category: TargetName;

  @Column({ type: 'enum', enum: PointValue })
  points: PointValue;

  @Column({ type: 'enum', enum: Branches })
  branch: Branches;

  @ManyToOne(() => PatientEntity, (patient) => patient.points, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  patient: PatientEntity | null;

  @OneToOne(() => FeedbackEntity, (feedback) => feedback.point, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  feedback: FeedbackEntity | null;

  @ManyToOne(() => UserEntity, (user) => user.points, {
    onDelete: 'CASCADE',
    eager: false,
  })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}