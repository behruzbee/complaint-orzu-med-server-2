import { IsEnum, IsOptional, IsString } from "class-validator";

export enum PointValue {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

export class CreatePointDto {
  @IsEnum(PointValue, {
    message: 'Оценка должна быть одним из следующих значений: 2, 3, 4 или 5',
  })
  points: PointValue;

  @IsOptional()
  @IsString()
  feedbackId?: string;
}
