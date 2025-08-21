import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { PointsService } from "./points.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { CheckRoles } from "src/common/decorators/roles.decorator";
import { CurrentUser, type CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { CreateManyPointsDto, CreatePointDto } from "./dto/create.dto";
import { PointEntity } from "./entities/points.entity";
import { Roles } from "src/common/enums/roles.enum";

@Controller('points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post()
  @CheckRoles(Roles.Admin, Roles.User)
  async create(
    @Body() createPointDto: CreatePointDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<PointEntity> {
    return this.pointsService.create({ ...createPointDto}, user.id);
  }

  @Post('bulk')
  @CheckRoles(Roles.Admin)
  async createMany(@Body() createPointDtos: CreateManyPointsDto, @CurrentUser() user: CurrentUserPayload): Promise<PointEntity[]> {
    return this.pointsService.createMany(createPointDtos.points, user.id, createPointDtos.branch, createPointDtos.phoneNumber);
  }

  @Get()
  @CheckRoles(Roles.Admin, Roles.User)
  async findAll(): Promise<PointEntity[]> {
    return this.pointsService.findAll();
  }

  @Get('with-feedback')
  @CheckRoles(Roles.Admin)
  async findWithFeedback(): Promise<PointEntity[]> {
    return this.pointsService.findWithFeedback();
  }

  @Get(':id')
  @CheckRoles(Roles.Admin, Roles.User)
  async findOne(@Param('id') id: string): Promise<PointEntity> {
    return this.pointsService.findOne(id);
  }

  @Delete('last-five')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckRoles(Roles.Admin)
  async removeLastFive(): Promise<void> {
    return this.pointsService.removeLastFivePoints();
  }

  @Delete('')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckRoles(Roles.Admin)
  async deleteAll(): Promise<void> {
    return this.pointsService.deleteAll();
  }
}
