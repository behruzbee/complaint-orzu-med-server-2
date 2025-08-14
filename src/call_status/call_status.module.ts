import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallStatusEntity } from './entities/call_status.entity';
import { CallStatusService } from './call_status.service';
import { CallStatusController } from './call_status.controller';
import { UserEntity } from 'src/users/entities/user.entity';
import { PatientEntity } from 'src/patients/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallStatusEntity, UserEntity, PatientEntity])],
  controllers: [CallStatusController],
  providers: [CallStatusService],
})
export class CallStatusModule {}
