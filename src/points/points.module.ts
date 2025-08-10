import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointEntity } from './entities/points.entity';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { UserEntity } from 'src/users/entities/user.entity';
import { FeedbacksModule } from 'src/feedbacks/feedbacks.module';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointEntity, UserEntity, FeedbackEntity]),
    FeedbacksModule
  ],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
