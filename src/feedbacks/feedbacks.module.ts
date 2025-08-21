// feedbacks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbackEntity } from './entities/feedback.entity';
import { TrelloModule } from 'src/trello/trello.module';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedbackEntity]),
    TrelloModule,
    BotModule,
  ],
  providers: [FeedbacksService],
  controllers: [FeedbacksController],
  exports: [FeedbacksService],
})
export class FeedbacksModule {}
