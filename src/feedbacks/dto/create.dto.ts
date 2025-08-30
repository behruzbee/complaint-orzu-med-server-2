import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * Категории обратной связи
 */
export enum FeedbackCategory {
  COMPLAINT = 'complaint',   // Жалоба
  SUGGESTION = 'suggestion', // Предложение
}

/**
 * DTO для создания обратной связи
 */
export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty({ message: 'Имя не должно быть пустым' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Фамилия не должна быть пустой' })
  lastName: string;

  @IsEnum(FeedbackCategory, { message: 'Неверная категория обратной связи' })
  category: FeedbackCategory;

  @IsString()
  @IsNotEmpty({ message: 'Номер телефона не должен быть пустым' })
  phoneNumber: string;

  @IsArray()
  voiceIds: string[];

  @IsArray()
  textsIds: string[];
}
