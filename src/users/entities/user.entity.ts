import { CallStatusEntity } from 'src/call_status/entities/call_status.entity';
import { Roles } from 'src/common/enums/roles.enum';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { PointEntity } from 'src/points/entities/points.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  login: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: Roles,
    default: Roles.User,
  })
  role: Roles;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => FeedbackEntity, (feedback) => feedback.user, {
    cascade: true,
  })
  feedbacks: FeedbackEntity[];

  @OneToMany(() => CallStatusEntity, (callStatus) => callStatus.user, {
    cascade: true,
  })
  call_statuses: CallStatusEntity[];

  @OneToMany(() => PointEntity, (point) => point.user, { cascade: true })
  points: PointEntity[];
}
