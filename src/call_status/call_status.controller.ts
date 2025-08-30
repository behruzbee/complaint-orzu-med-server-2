import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CallStatusService } from './call_status.service';
import { CreateCallStatusDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CheckRoles } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/enums/roles.enum';
import { CurrentUser, type CurrentUserPayload } from 'src/common/decorators/current-user.decorator';

@Controller('call_status')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CallStatusController {
  constructor(private readonly callStatusService: CallStatusService) {}

  @Post()
  @CheckRoles(Roles.Admin)
  async createCallStatus(
    @Body() dto: CreateCallStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.callStatusService.create(dto, user.id);
  }

  @Get()
  @CheckRoles(Roles.Admin, Roles.User)
  async getAllCallStatus() {
    return await this.callStatusService.getAll();
  }

  @Delete()
  @CheckRoles(Roles.Admin)
  async deleteLastCallStatus() {
    return await this.callStatusService.deleteLast();
  }
}
