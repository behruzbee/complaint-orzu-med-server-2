import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateFeedbackDto } from 'src/feedbacks/dto/create.dto';

export enum PointValue {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

export enum TargetName {
  DOCTORS = 'Врачлар тугрисида',
  NURSES = 'Хамширалар тугрисида',
  CLEANING = 'Тозалик тугрисида (хоз.часть)',
  KITCHEN = 'Ошхана ва ошпазлар тугрисида',
  RECEPTION = 'Регистратура ходимлари тугрисида',
}

export enum Branches {
  CHINOZ = 'ЧИНОЗ',
  YUNUSABAD = 'ЮНУСАБАД',
  OQQURGHON = 'ОККУРГОН',
  YANGIBOZOR = 'ЯНГИ БОЗОР',
  ZANGIOTA = 'ЗАНГИОТА',
  PARKENT = 'ПАРКЕНТ',
  FOTIMA_SULTON = 'ФОТИМА-СУЛТОН',
}

export class CreatePointDto {
  @IsEnum(PointValue, {
    message: 'Оценка должна быть одним из следующих значений: 2, 3, 4 или 5',
  })
  points: PointValue;

  @IsEnum(TargetName, {
    message: `Категория должна быть одной из: ${Object.values(TargetName).join(', ')}`,
  })
  category: TargetName;

  @IsEnum(Branches, {
    message: `Филиал должна быть одним из: ${Object.values(Branches).join(', ')}`,
  })
  branch: Branches;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFeedbackDto)
  feedback?: CreateFeedbackDto;
}

export class CreateManyPointsDto {
  @IsArray({ message: 'Должен быть массив объектов' })
  @ValidateNested({ each: true })
  @Type(() => CreatePointDto)
  points: CreatePointDto[];

  @IsEnum(Branches, {
    message: `Филиал должна быть одним из: ${Object.values(Branches).join(', ')}`,
  })
  branch: Branches;

  @IsString()
  phoneNumber: string;
}
