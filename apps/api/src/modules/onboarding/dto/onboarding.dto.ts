import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { mediaTypeValues, type MediaType } from '@recommendation-genie/types';

export class OnboardingTypesDto {
  @IsArray()
  @IsEnum(mediaTypeValues, { each: true })
  mediaTypes!: MediaType[];
}

export class OnboardingSelectionsDto {
  @IsArray()
  @IsString({ each: true })
  mediaItemIds!: string[];
}

export class OnboardingRatingsDto {
  @IsArray()
  ratings!: Array<{ mediaItemId: string; rating: number }>;
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
