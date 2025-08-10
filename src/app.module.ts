import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserEntity } from './users/entities/user.entity';
import { FeedbackEntity } from './feedbacks/entities/feedback.entity';
import { PointEntity } from './points/entities/points.entity';
import { CallStatusEntity } from './call_status/entities/call_status.entity';
import { UsersModule } from './users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { CallStatusModule } from './call_status/call_status.module';
import { PointsModule } from './points/points.module';
import { BotModule } from './bot/bot.module';
import { VoiceMessageEntity } from './bot/entities/voice_message.entity';
import { TextMessageEntity } from './bot/entities/text_message.entity';
import { TrelloModule } from './trello/trello.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { TrelloCardEntity } from './trello/entities/trello.entity';
import { PatientEntity } from './patients/entities/patient.entity';
import { PatientsModule } from './patients/patients.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOSTNAME,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: true,
      retryAttempts: 3,
      retryDelay: 5000,
      entities: [
        UserEntity,
        FeedbackEntity,
        PointEntity,
        CallStatusEntity,
        VoiceMessageEntity,
        TextMessageEntity,
        TrelloCardEntity,
        PatientEntity
      ],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET_KEY,
      signOptions: {},
    }),
    UsersModule,
    AuthModule,
    CallStatusModule,
    ReportModule,
    PointsModule,
    BotModule,
    TrelloModule,
    FeedbacksModule,
    PatientsModule
  ],
})
export class AppModule {}
