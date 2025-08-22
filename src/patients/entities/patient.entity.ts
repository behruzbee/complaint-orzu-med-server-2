import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';

export enum PatientStatus {
  NEW = 'Поступивший',
  REGULAR = 'Постоянный',
}

@Entity('patients')
export class PatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phoneNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({
    type: 'enum',
    enum: PatientStatus,
    default: PatientStatus.NEW,
  })
  status: PatientStatus;

  @OneToMany(() => FeedbackEntity, (feedback) => feedback.patient, {
    nullable: true,
  })
  feedbacks: FeedbackEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
