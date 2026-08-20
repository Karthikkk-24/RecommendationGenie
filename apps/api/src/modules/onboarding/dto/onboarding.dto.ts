import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { mediaTypeValues, supportedMediaTypeValues, type MediaType } from '@recommendation-genie/types';

export class OnboardingTypesDto {
  @IsArray()
  @IsEnum(supportedMediaTypeValues, { each: true })
  mediaTypes!: MediaType[];
}

export class OnboardingSelectionsDto {
  @IsArray()
  @IsString({ each: true })
  mediaItemIds!: string[];
}

export class OnboardingRatingItemDto {
  @IsString()
  mediaItemId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

export class OnboardingRatingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingRatingItemDto)
  ratings!: OnboardingRatingItemDto[];
}

export class OnboardingPreferencesDto {
  @IsArray()
  @IsString({ each: true })
  favoriteGenres!: string[];

  @IsArray()
  @IsString({ each: true })
  dislikedGenres!: string[];

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  preferredPacing?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  preferredComplexity?: number;

  @IsOptional()
  @IsString()
  preferredTone?: string;

  @IsArray()
  @IsString({ each: true })
  preferredThemes!: string[];
}
