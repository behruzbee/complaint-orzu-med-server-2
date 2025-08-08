import { IsEnum, IsString, MinLength } from 'class-validator';
import { Roles } from 'src/common/enums/roles.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(4, { message: 'Логин должен содержать минимум 4 символа' })
  login: string;

  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @IsEnum(Roles, { message: 'Роль должна быть Admin или User' })
  role: Roles;
}
