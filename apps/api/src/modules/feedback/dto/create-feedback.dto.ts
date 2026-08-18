import { IsEnum, IsOptional, IsString } from 'class-validator';
import { feedbackActionValues, feedbackReasonValues, type FeedbackAction, type FeedbackReason } from '@recommendation-genie/types';

export class CreateFeedbackDto {
  @IsString()
  mediaItemId!: string;

  @IsEnum(feedbackActionValues)
  action!: FeedbackAction;

  @IsOptional()
  @IsEnum(feedbackReasonValues)
  reason?: FeedbackReason;

  @IsOptional()
  @IsString()
  otherText?: string;

  @IsOptional()
  @IsString()
  recommendationItemId?: string;
}
