import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbacksService } from './feedbacks.service';
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
  exports: [FeedbacksService]
})
export class FeedbacksModule {}
