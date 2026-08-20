import { z } from 'zod';

export const mediaTypeValues = ['MOVIE', 'GAME', 'MUSIC', 'BOOK', 'TV_SHOW', 'ANIME', 'PODCAST'] as const;
export const mediaTypeSchema = z.enum(mediaTypeValues);
export type MediaType = z.infer<typeof mediaTypeSchema>;

/** Types with live/mock providers today — onboarding should only offer these. */
export const supportedMediaTypeValues = ['MOVIE', 'GAME', 'MUSIC'] as const;
export const supportedMediaTypeSchema = z.enum(supportedMediaTypeValues);
export type SupportedMediaType = z.infer<typeof supportedMediaTypeSchema>;
export const activeMediaTypes = ['MOVIE', 'GAME', 'MUSIC'] as const satisfies readonly MediaType[];

export const userRoleValues = ['USER', 'ADMIN'] as const;
export const userRoleSchema = z.enum(userRoleValues);
export type UserRole = z.infer<typeof userRoleSchema>;

export const onboardingStatusValues = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export const onboardingStatusSchema = z.enum(onboardingStatusValues);
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const interactionTypeValues = [
  'VIEW',
  'CLICK',
  'LIKE',
  'LOVE',
  'DISLIKE',
  'SAVE',
  'SKIP',
  'CONSUMED',
  'RATED',
  'NOT_INTERESTED',
] as const;
export const interactionTypeSchema = z.enum(interactionTypeValues);
export type InteractionType = z.infer<typeof interactionTypeSchema>;

export const feedbackReasonValues = [
  'TOO_SLOW',
  'TOO_PREDICTABLE',
  'WRONG_GENRE',
  'DONT_LIKE_CREATOR',
  'NOT_INTERESTED_IN_PREMISE',
  'TOO_DIFFICULT',
  'TOO_DARK',
  'TOO_MAINSTREAM',
  'TOO_OBSCURE',
  'NOT_MY_MOOD',
  'OTHER',
] as const;
export const feedbackReasonSchema = z.enum(feedbackReasonValues);
export type FeedbackReason = z.infer<typeof feedbackReasonSchema>;

export const feedbackActionValues = [
  'LOVE',
  'LIKE',
  'MAYBE',
  'NOT_FOR_ME',
  'NEVER_THIS_TYPE',
  'ALREADY_CONSUMED',
  'SAVE',
] as const;
export const feedbackActionSchema = z.enum(feedbackActionValues);
export type FeedbackAction = z.infer<typeof feedbackActionSchema>;

export const featureTypeValues = ['GENRE', 'THEME', 'TAG', 'CREATOR', 'MEDIA_TYPE', 'PACING'] as const;
export const featureTypeSchema = z.enum(featureTypeValues);
export type FeatureType = z.infer<typeof featureTypeSchema>;

export const personRoleValues = [
  'ACTOR',
  'DIRECTOR',
  'ARTIST',
  'DEVELOPER',
  'WRITER',
  'COMPOSER',
  'PUBLISHER',
] as const;
export const personRoleSchema = z.enum(personRoleValues);
export type PersonRole = z.infer<typeof personRoleSchema>;

export const recommendationModeValues = [
  'FOR_YOU',
  'SIMILAR_TO',
  'HIDDEN_GEMS',
  'DEEP_CUTS',
  'SURPRISE_ME',
  'MOOD',
  'SHORTLIST',
] as const;
export const recommendationModeSchema = z.enum(recommendationModeValues);
export type RecommendationMode = z.infer<typeof recommendationModeSchema>;

export const moodValues = [
  'CHILL',
  'ADRENALINE',
  'EMOTIONAL',
  'DARK',
  'FUNNY',
  'MIND_BENDING',
  'RELAXING',
  'INTENSE',
] as const;
export const moodSchema = z.enum(moodValues);
export type Mood = z.infer<typeof moodSchema>;

export const libraryFilterValues = ['ALL', 'LOVED', 'LIKED', 'SAVED', 'CONSUMED', 'REJECTED'] as const;
export const libraryFilterSchema = z.enum(libraryFilterValues);
export type LibraryFilter = z.infer<typeof libraryFilterSchema>;

export const librarySortValues = [
  'RECENTLY_ADDED',
  'HIGHEST_RATED',
  'RECENTLY_CONSUMED',
  'ALPHABETICAL',
] as const;
export const librarySortSchema = z.enum(librarySortValues);
export type LibrarySort = z.infer<typeof librarySortSchema>;
