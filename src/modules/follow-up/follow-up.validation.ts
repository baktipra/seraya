import type { GuestFollowUpMetadata } from './follow-up.types';

const metadataValueMaxLength = 80;

export class GuestFollowUpValidationError extends Error {
  constructor(message = 'The guest follow-up event contract is invalid.') {
    super(message);
    this.name = 'GuestFollowUpValidationError';
  }
}

function normalizeOptionalMetadataValue(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new GuestFollowUpValidationError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > metadataValueMaxLength) {
    throw new GuestFollowUpValidationError(`${fieldName} has an invalid length.`);
  }

  return normalized;
}

/**
 * Produces the only metadata shape accepted by the server repository. Unknown
 * keys are rejected rather than copied so secrets cannot hitchhike into JSON.
 */
export function normalizeGuestFollowUpMetadata(
  metadata: GuestFollowUpMetadata | undefined,
): GuestFollowUpMetadata {
  if (!metadata) {
    return {};
  }

  const allowedKeys = new Set(['noteCategory', 'sourceSurface', 'templateVersion']);
  for (const key of Object.keys(metadata)) {
    if (!allowedKeys.has(key)) {
      throw new GuestFollowUpValidationError('Guest follow-up metadata contains an unknown key.');
    }
  }

  const noteCategory = normalizeOptionalMetadataValue(metadata.noteCategory, 'noteCategory');
  const sourceSurface = normalizeOptionalMetadataValue(metadata.sourceSurface, 'sourceSurface');
  const templateVersion = normalizeOptionalMetadataValue(
    metadata.templateVersion,
    'templateVersion',
  );

  return {
    ...(noteCategory ? { noteCategory } : {}),
    ...(sourceSurface ? { sourceSurface } : {}),
    ...(templateVersion ? { templateVersion } : {}),
  };
}
