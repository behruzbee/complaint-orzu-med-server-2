import { PatientEntity } from 'src/patients/entities/patient.entity';
import { Branches } from 'src/points/dto/create.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';

export enum CallStatusType {
  NO_ANSWER = 'no_answer',
  WRONG_NUMBER = 'wrong_number',
  NO_CONNECTION = 'no_connection',
}

@Entity('call_statuses')
export class CallStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CallStatusType,
  })
  status: CallStatusType;

  @Column({ length: 20 })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: Branches,
  })
  branch: Branches;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.call_statuses, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user: UserEntity | null;

  @ManyToOne(() => PatientEntity, (patient) => patient.call_statuses, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  patient: PatientEntity | null;
}
