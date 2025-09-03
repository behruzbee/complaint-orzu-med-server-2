import { Module } from '@nestjs/common';
import { PatientsModule } from 'src/patients/patients.module';
import { WhatsappAuthService } from './qr-code.service';
import { WhatsappController } from './qr-code.controller';

@Module({
  imports: [PatientsModule], // чтобы работал PatientsService
  providers: [WhatsappAuthService],
  controllers: [WhatsappController],
  exports: [WhatsappAuthService],
})
export class WhatsappModule {}
