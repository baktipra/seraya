export type ProjectStatusLabel = 'Draft' | 'Dipublikasikan';

export function getProjectCoupleLabel(personOneName: string, personTwoName: string) {
  return `${personOneName} & ${personTwoName}`;
}

export function getProjectStatusLabel(status: string): ProjectStatusLabel {
  return status === 'published' ? 'Dipublikasikan' : 'Draft';
}

export function formatProjectEventDate(value: string | null) {
  if (!value) {
    return 'Tanggal belum ditentukan';
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
