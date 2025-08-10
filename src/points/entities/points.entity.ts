import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { TargetName, PointValue, Branches } from '../dto/create.dto';

@Entity('points')
export class PointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TargetName,
  })
  category: TargetName;

  @Column({
    type: 'enum',
    enum: PointValue,
  })
  points: PointValue;

  @Column({
    type: 'enum',
    enum: Branches,
  })
  branch: Branches;

  @OneToOne(() => FeedbackEntity, (feedback) => feedback.point, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  feedback: FeedbackEntity | null;

  @ManyToOne(() => UserEntity, (user) => user.points, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}
