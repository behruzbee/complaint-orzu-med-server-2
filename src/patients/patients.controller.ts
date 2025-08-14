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
} from '@nestjs/common';
import { CreatePatientDto } from './dto/create.dto';
import { PatientsService } from './patients.service';
import { PatientStatus } from './entities/patient.entity';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('create')
  async createPatient(@Body() dto: CreatePatientDto) {
    try {
      return await this.patientsService.addPatientManually(dto);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Получить поступивших
  @Get('new')
  async getNewPatients() {
    try {
      return await this.patientsService.getPatientsByStatus(
        PatientStatus.NEW,
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Получить постоянных
  @Get('regular')
  async getPermanentPatients() {
    try {
      return await this.patientsService.getPatientsByStatus(
        PatientStatus.REGULAR,
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async deletePatient(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.patientsService.deletePatient(id);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
