import { IsEnum, IsString, Matches } from 'class-validator';
import { CallStatusType } from '../entities/call_status.entity';
import { Branches } from 'src/points/dto/create.dto';

export class CreateCallStatusDto {
  @IsString({ message: 'Номер телефона должен быть строкой.' })
  phoneNumber: string;

  @IsEnum(CallStatusType, {
    message: 'Статус должен быть одним из допустимых значений: no_answer, wrong_number, no_connection, answered.',
  })
  status: CallStatusType;

  @IsEnum(Branches, {
    message: `Филиал должна быть одним из: ${Object.values(Branches).join(', ')}`,
  })
  branch: Branches;
}
