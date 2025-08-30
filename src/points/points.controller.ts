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

  @Post('bulk')
  @CheckRoles(Roles.Admin)
  async createMany(@Body() createPointDtos: CreateManyPointsDto, @CurrentUser() user: CurrentUserPayload): Promise<PointEntity[]> {
    return this.pointsService.createMany(createPointDtos, user.id);
  }

  @Get()
  @CheckRoles(Roles.Admin, Roles.User)
  async findAll(): Promise<PointEntity[]> {
    return this.pointsService.findAll();
  }

  @Delete('last-five')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckRoles(Roles.Admin)
  async removeLastFive(): Promise<void> {
    return this.pointsService.removeLastFivePoints();
  }

  @Delete('/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckRoles(Roles.Admin)
  async deleteAll(): Promise<void> {
    return this.pointsService.deleteAll();
  }
}
