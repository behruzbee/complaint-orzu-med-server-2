import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PatientEntity } from 'src/patients/entities/patient.entity';
import { CallStatusEntity } from 'src/call_status/entities/call_status.entity';
import { PointEntity } from 'src/points/entities/points.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientEntity, CallStatusEntity, PointEntity]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
