import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { CallStatusEntity } from 'src/call_status/entities/call_status.entity';
import { PointEntity } from 'src/points/entities/points.entity';

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

  @Column({ nullable: true })
  firstName?: string | null;

  @Column({ nullable: true })
  lastName?: string | null;

  @Column({ name: 'branch', nullable: true })
  branch: string;

  @Column({
    type: 'enum',
    enum: PatientStatus,
    default: PatientStatus.NEW,
  })
  status: PatientStatus;

  @Column({ nullable: true })
  checkOutTime: string | null;

  @OneToMany(() => FeedbackEntity, (feedback) => feedback.patient, {
    nullable: true,
  })
  feedbacks: FeedbackEntity[];

  @OneToMany(() => CallStatusEntity, (call_status) => call_status.patient, {
    nullable: true,
  })
  call_statuses: CallStatusEntity[];

  @OneToMany(() => PointEntity, (point) => point.patient, {
    nullable: true,
  })
  points: PointEntity[]; // ✅ массив, а не объект

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
