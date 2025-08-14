import { Branches } from 'src/points/dto/create.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

export enum CallStatusType {
  NO_ANSWER = 'no_answer',
  WRONG_NUMBER = 'wrong_number',
  NO_CONNECTION = 'no_connection',
  ANSWERED = 'answered',
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

  @Column()
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: Branches,
  })
  branch: Branches;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.call_statuses, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
}
