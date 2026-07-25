function getInitial(value: string) {
  const normalized = value.trim();
  const firstCharacter = Array.from(normalized)[0];

  return firstCharacter?.toLocaleUpperCase('id-ID') ?? '';
}

/**
 * Keeps the Laras opening personal to the couple without depending on the
 * rendered hero title or introducing invitation authority into presentation.
 */
export function createLarasMonogram(personOneName: string, personTwoName: string) {
  const monogram = [getInitial(personOneName), getInitial(personTwoName)]
    .filter(Boolean)
    .join('');

  return monogram || 'L';
}
