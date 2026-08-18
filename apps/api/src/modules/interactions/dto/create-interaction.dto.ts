import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { interactionTypeValues, type InteractionType } from '@recommendation-genie/types';

export class CreateInteractionDto {
  @IsString()
  mediaItemId!: string;

  @IsEnum(interactionTypeValues)
  type!: InteractionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  recommendationItemId?: string;
}
