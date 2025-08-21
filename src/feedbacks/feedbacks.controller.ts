// feedbacks.controller.ts
import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create.dto';
import { FeedbackEntity } from './entities/feedback.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CheckRoles } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/enums/roles.enum';

@Controller('feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Get()
  @CheckRoles(Roles.Admin, Roles.User)
  async findAll(): Promise<FeedbackEntity[]> {
    return this.feedbacksService.findAll();
  }

  @Get('by-phone/:phone')
  @CheckRoles(Roles.Admin, Roles.User)
  async findByPhone(
    @Param('phone') phone: string,
  ): Promise<FeedbackEntity[]> {
    return this.feedbacksService.findByPhone(phone);
  }

  @Get('by-user/:userId')
  @CheckRoles(Roles.Admin)
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<FeedbackEntity[]> {
    return this.feedbacksService.findByUser(userId);
  }

  @Get('by-status/:status')
  @CheckRoles(Roles.Admin)
  async findByStatus(
    @Param('status') status: string,
  ): Promise<FeedbackEntity[]> {
    return this.feedbacksService.findByStatus(status);
  }
}
