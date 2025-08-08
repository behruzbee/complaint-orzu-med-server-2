import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PointsService } from './points.service';
import { CreatePointDto } from './dto/create.dto';
import { PointEntity } from './entities/points.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CheckRoles } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/enums/roles.enum';
import { CurrentUser, type CurrentUserPayload } from 'src/common/decorators/current-user.decorator';

@Controller('points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post()
  @CheckRoles(Roles.Admin)
  async create(@Body() createPointDto: CreatePointDto, @CurrentUser() user: CurrentUserPayload): Promise<PointEntity> {
    return this.pointsService.create(createPointDto, user.id);
  }

  @Get()
  @CheckRoles(Roles.Admin, Roles.User)
  async findAll(): Promise<PointEntity[]> {
    return this.pointsService.findAll();
  }

  @Delete()
  @CheckRoles(Roles.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLast(): Promise<void> {
    return this.pointsService.deleteLast();
  }
}
