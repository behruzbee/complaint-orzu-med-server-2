import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum FeedbackCategory {
  COMPLAINT = 'complaint',
  SUGGESTION = 'suggestion',
}

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  passport: string;

  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string
}
