// src/patients/patients.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreatePatientDto } from './dto/create.dto';
import { PatientsService } from './patients.service';
import { PatientStatus } from './entities/patient.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CheckRoles } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/enums/roles.enum';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @CheckRoles(Roles.Admin)
  async create(@Body() dto: CreatePatientDto) {
    return this.patientsService.addPatientManually(dto);
  }

  @Get('status/:status')
  @CheckRoles(Roles.Admin, Roles.User)
  async getByStatus(@Param('status') status: PatientStatus) {
    return this.patientsService.getPatientsByStatus(status);
  }

  @Get(':id')
  @CheckRoles(Roles.Admin, Roles.User)
  async getById(@Param('id') id: string) {
    const patient = await this.patientsService.getPatientById(id);
    if (!patient) {
      throw new HttpException('Пациент не найден', HttpStatus.NOT_FOUND);
    }
    return patient;
  }

  @Delete(':id')
  @CheckRoles(Roles.Admin)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.deletePatient(id);
  }
}