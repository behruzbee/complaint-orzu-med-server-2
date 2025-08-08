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
      entities: [UserEntity, FeedbackEntity, PointEntity, CallStatusEntity],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET_KEY,
      signOptions: {},
    }),
    UsersModule,
    AuthModule,
    CallStatusModule,
    PointsModule
  ],
})
export class AppModule {}
