import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointEntity } from './entities/points.entity';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointEntity, FeedbackEntity, UserEntity]),
  ],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
