import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @Matches(/^\+?\d{9,15}$/, {
    message: 'Номер телефона должен быть в международном формате',
  })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  branch?: string;
}
