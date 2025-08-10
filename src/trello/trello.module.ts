import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrelloController } from './trello.controller';
import { TrelloService } from './trello.service';
import { TextMessageEntity } from 'src/bot/entities/text_message.entity';
import { VoiceMessageEntity } from 'src/bot/entities/voice_message.entity';
import { TrelloCardEntity } from './entities/trello.entity';
import { FeedbackEntity } from 'src/feedbacks/entities/feedback.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrelloCardEntity,
      FeedbackEntity,
      TextMessageEntity,
      VoiceMessageEntity,
    ]),
  ],
  controllers: [TrelloController],
  providers: [TrelloService],
  exports: [TrelloService]
})
export class TrelloModule {}
