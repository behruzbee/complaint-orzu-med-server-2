import { Module } from "@nestjs/common";
import { BotWebhookController } from "./bot.webhook";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VoiceMessageEntity } from "./entities/voice_message.entity";
import { BotService } from "./services/bot.service";
import { MediaService } from "./services/media.service";
import { TextMessageEntity } from "./entities/text_message.entity";
import { MessageController } from "./bot.controller";
import { PatientsModule } from "src/patients/patients.module";

@Module({
  imports: [TypeOrmModule.forFeature([VoiceMessageEntity, TextMessageEntity]), PatientsModule],
  controllers: [BotWebhookController, MessageController],
  providers: [BotService, MediaService],
  exports: [BotService]
})
export class BotModule {}