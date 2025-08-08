import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CallStatusType } from '../entities/call_status.entity';

export class CreateCallStatusDto {
  @IsOptional()
  @IsString({ message: 'Номер телефона должен быть строкой.' })
  phoneNumber?: string;

  @IsEnum(CallStatusType, {
    message: 'Статус должен быть одним из допустимых значений: no_answer, wrong_number, no_connection, answered.',
  })
  status: CallStatusType;
}
