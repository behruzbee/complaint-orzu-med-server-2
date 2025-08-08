import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PointsModule } from "src/points/points.module";
import { UserEntity } from "src/users/entities/user.entity";
import { FeedbacksService } from "./feedbacks.service";
import { FeedbacksController } from "./feedbacks.controller";
import { FeedbackEntity } from "./entities/feedback.entity";

@Module({
imports: [TypeOrmModule.forFeature([FeedbackEntity, UserEntity]), PointsModule],
providers: [FeedbacksService],
controllers:[FeedbacksController]
})
export class FeedbacksModule {}