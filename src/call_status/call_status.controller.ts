import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { CallStatusService } from './call_status.service';
import { CreateCallStatusDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CheckRoles } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/enums/roles.enum';
import { CurrentUser, type CurrentUserPayload } from 'src/common/decorators/current-user.decorator';

@Controller('call-status')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CallStatusController {
  private readonly logger = new Logger(CallStatusController.name);

  constructor(private readonly callStatusService: CallStatusService) {}

  @Post()
  @CheckRoles(Roles.Admin)
  async createCallStatus(
    @Body() dto: CreateCallStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.logger.log(`User ${user.id} creating call status for ${dto.phoneNumber}`);
    return await this.callStatusService.create(dto, user.id);
  }

  @Get()
  @CheckRoles(Roles.Admin, Roles.User)
  async getAllCallStatus(
    @Query('take') take = '50',
    @Query('skip') skip = '0',
  ) {
    const t = Math.min(Number(take) || 50, 200);
    const s = Math.max(Number(skip) || 0, 0);
    return await this.callStatusService.getAll({ take: t, skip: s });
  }

  @Delete(':id?')
  @CheckRoles(Roles.Admin)
  async deleteLastCallStatus() {
    return await this.callStatusService.deleteLast();
  }
}
