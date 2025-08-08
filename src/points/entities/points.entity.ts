import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('points')
export class PointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [2, 3, 4, 5],
  })
  points: 2 | 3 | 4 | 5;

  @OneToOne(() => FeedbackEntity, (feedback) => feedback.point, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn()
  feedback: FeedbackEntity | null;

  @ManyToOne(() => UserEntity, (user) => user.points, { onDelete: 'CASCADE' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}
