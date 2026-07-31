import {
  cloneElement,
  isValidElement,
  memo,
  type ReactNode,
} from 'react';

import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

/**
 * Compatibility export for existing editor consumers and tests. The legacy
 * label/order remain stable here while Release B navigation uses the canonical
 * invitation journey derived from the same records below.
 */
export const invitationEditorSections = [
  {
    editorTitle: 'Desain',
    key: 'style',
    label: 'Gaya undangan',
    number: '01',
    optional: false,
    previewTarget: 'opening',
    studioLabel: 'Desain',
  },
  {
    editorTitle: 'Sampul',
    key: 'opening',
    label: 'Pembuka',
    number: '02',
    optional: false,
    previewTarget: 'opening',
    studioLabel: 'Sampul',
  },
  {
    editorTitle: 'Mempelai',
    key: 'couple',
    label: 'Mempelai',
    number: '03',
    optional: false,
    previewTarget: 'couple',
    studioLabel: 'Mempelai',
  },
  {
    editorTitle: 'Cerita kalian',
    key: 'story',
    label: 'Cerita',
    number: '04',
    optional: true,
    previewTarget: 'story',
    studioLabel: 'Cerita',
  },
  {
    editorTitle: 'Acara',
    key: 'schedule',
    label: 'Rangkaian acara',
    number: '05',
    optional: false,
    previewTarget: 'events',
    studioLabel: 'Acara',
  },
  {
    editorTitle: 'Galeri',
    key: 'gallery',
    label: 'Galeri',
    number: '06',
    optional: true,
    previewTarget: 'gallery',
    studioLabel: 'Galeri',
  },
  {
    editorTitle: 'Respons Tamu',
    key: 'rsvp',
    label: 'Konfirmasi tamu',
    number: '08',
    optional: true,
    previewTarget: 'response',
    studioLabel: 'Respons Tamu',
  },
  {
    editorTitle: 'Amplop Digital',
    key: 'gift',
    label: 'Amplop Digital',
    number: '07',
    optional: true,
    previewTarget: 'digital-gift',
    studioLabel: 'Amplop Digital',
  },
  {
    editorTitle: 'Penutup',
    key: 'closing',
    label: 'Penutup',
    number: '09',
    optional: true,
    previewTarget: 'closing',
    studioLabel: 'Penutup',
  },
] as const;

export type InvitationEditorSectionKey =
  (typeof invitationEditorSections)[number]['key'];
export type InvitationEditorSectionStatus =
  | 'complete'
  | 'error'
  | 'incomplete'
  | 'optional_off';

export type InvitationEditorSectionStatuses = Record<
  InvitationEditorSectionKey,
  InvitationEditorSectionStatus
>;

const canonicalChapterOrder: readonly InvitationEditorSectionKey[] = [
  'style',
  'opening',
  'couple',
  'story',
  'schedule',
  'gallery',
  'gift',
  'rsvp',
  'closing',
];

const invitationStudioChapters = canonicalChapterOrder.map((chapterKey) => {
  const chapter = invitationEditorSections.find(
    (candidate) => candidate.key === chapterKey,
  );

  if (!chapter) {
    throw new Error(`Unknown invitation studio chapter: ${chapterKey}`);
  }

  return chapter;
});

const sectionStatusCopy: Record<
  InvitationEditorSectionStatus | 'current',
  { label: string; symbol: string }
> = {
  complete: { label: 'Lengkap', symbol: '✓' },
  current: { label: 'Sedang dibuka', symbol: '•' },
  error: { label: 'Perlu diperbaiki', symbol: '!' },
  incomplete: { label: 'Belum lengkap', symbol: '○' },
  optional_off: { label: 'Tidak ditampilkan', symbol: '–' },
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getInvitationEditorSectionForField(
  fieldName: string,
): InvitationEditorSectionKey | null {
  if (fieldName === 'templateKey') return 'style';
  if (fieldName.startsWith('hero.')) return 'opening';
  if (fieldName.startsWith('couple.')) return 'couple';
  if (fieldName.startsWith('story.')) return 'story';
  if (fieldName.startsWith('eventSchedule.')) return 'schedule';
  if (fieldName.startsWith('rsvp.')) return 'rsvp';
  if (fieldName.startsWith('digitalGift.')) return 'gift';
  if (fieldName.startsWith('closing.')) return 'closing';

  return null;
}

function getSectionsWithErrors(errors?: InvitationEditorFieldErrors) {
  const sections = new Set<InvitationEditorSectionKey>();

  for (const fieldName of Object.keys(errors ?? {})) {
    const section = getInvitationEditorSectionForField(fieldName);

    if (section) {
      sections.add(section);
    }
  }

  return sections;
}

export function getInvitationEditorErrorSections(
  errors?: InvitationEditorFieldErrors,
) {
  const sectionsWithErrors = getSectionsWithErrors(errors);

  return invitationStudioChapters
    .map((section) => section.key)
    .filter((section) => sectionsWithErrors.has(section));
}

export function getInvitationEditorSectionStatuses(
  draft: InvitationDraft,
  errors?: InvitationEditorFieldErrors,
): InvitationEditorSectionStatuses {
  const content = draft.content;
  const errorSections = getSectionsWithErrors(errors);
  const firstEvent = content.eventSchedule.events[0];

  const statuses: InvitationEditorSectionStatuses = {
    style: content.templateKey ? 'complete' : 'incomplete',
    opening: hasText(content.hero.title) ? 'complete' : 'incomplete',
    couple:
      hasText(content.couple.personOne.displayName) &&
      hasText(content.couple.personTwo.displayName)
        ? 'complete'
        : 'incomplete',
    story: !content.story.enabled
      ? 'optional_off'
      : hasText(content.story.heading) || hasText(content.story.body)
        ? 'complete'
        : 'incomplete',
    schedule:
      firstEvent &&
      content.eventSchedule.events.every(
        (event) =>
          hasText(event.title) &&
          hasText(event.date) &&
          hasText(event.startTime),
      )
        ? 'complete'
        : 'incomplete',
    gallery:
      content.gallery.enabled && content.gallery.imageIds.length > 0
        ? 'complete'
        : 'optional_off',
    rsvp: !content.rsvp.enabled
      ? 'optional_off'
      : hasText(content.rsvp.heading) || hasText(content.rsvp.lead)
        ? 'complete'
        : 'incomplete',
    gift: !content.digitalGift.enabled
      ? 'optional_off'
      : content.digitalGift.accounts.length > 0 &&
          content.digitalGift.accounts.every(
            (account) =>
              hasText(account.providerName) &&
              hasText(account.accountHolder) &&
              hasText(account.accountNumber),
          )
        ? 'complete'
        : 'incomplete',
    closing: !content.closing.enabled
      ? 'optional_off'
      : hasText(content.closing.message) || hasText(content.closing.signature)
        ? 'complete'
        : 'incomplete',
  };

  for (const section of errorSections) {
    statuses[section] = 'error';
  }

  return statuses;
}

function getInvitationEditorProgress(
  statuses: InvitationEditorSectionStatuses,
) {
  const values = Object.values(statuses);

  return {
    complete: values.filter((status) => status === 'complete').length,
    error: values.filter((status) => status === 'error').length,
    total: invitationStudioChapters.length,
  };
}

function SectionState({
  current,
  status,
}: {
  current: boolean;
  status: InvitationEditorSectionStatus;
}) {
  const copy = sectionStatusCopy[current ? 'current' : status];

  return (
    <span
      aria-label={copy.label}
      className={[
        'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold',
        current
          ? 'bg-seraya-action-primary text-white'
          : status === 'error'
            ? 'bg-seraya-status-error-soft text-seraya-status-error'
            : status === 'complete'
              ? 'bg-seraya-status-success-soft text-seraya-status-success'
              : 'bg-seraya-brand-soft text-seraya-text-secondary',
      ].join(' ')}
      title={copy.label}
    >
      <span aria-hidden="true">{copy.symbol}</span>
    </span>
  );
}

function SectionButton({
  current,
  onSelect,
  section,
  status,
}: {
  current: boolean;
  onSelect: (section: InvitationEditorSectionKey) => void;
  section: (typeof invitationEditorSections)[number];
  status: InvitationEditorSectionStatus;
}) {
  return (
    <button
      aria-controls={`invitation-editor-panel-${section.key}`}
      aria-current={current ? 'step' : undefined}
      className={[
        'focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--seraya-radius-md)] px-3 text-left text-sm transition-colors focus-visible:outline-3 focus-visible:outline-offset-2',
        current
          ? 'bg-seraya-brand-soft text-seraya-action-primary font-semibold'
          : 'bg-seraya-surface text-seraya-text-secondary hover:bg-seraya-canvas hover:text-seraya-text-primary',
      ].join(' ')}
      data-invitation-editor-chapter={section.key}
      onClick={() => onSelect(section.key)}
      type="button"
    >
      <SectionState current={current} status={status} />
      <span className="whitespace-nowrap">
        <span className="text-seraya-text-muted mr-1.5 text-[0.68rem] font-bold tracking-[0.06em]">
          {section.number}
        </span>
        {section.studioLabel}
      </span>
    </button>
  );
}

export const InvitationWorkspaceNavigation = memo(
  function InvitationWorkspaceNavigation({
    activeSection,
    onSelect,
    statuses,
  }: {
    activeSection: InvitationEditorSectionKey;
    onSelect: (section: InvitationEditorSectionKey) => void;
    statuses: InvitationEditorSectionStatuses;
  }) {
    const activeIndex = invitationStudioChapters.findIndex(
      (section) => section.key === activeSection,
    );
    const active =
      invitationStudioChapters[activeIndex] ?? invitationStudioChapters[0]!;
    const progress = getInvitationEditorProgress(statuses);
    const progressCopy =
      progress.error > 0
        ? `${progress.complete} lengkap · ${progress.error} perlu diperbaiki`
        : `${progress.complete} dari ${progress.total} lengkap`;

    return (
      <>
        <nav
          aria-label="Bagian undangan"
          className="border-seraya-border-default bg-seraya-surface/95 sticky top-16 z-20 -mx-5 w-auto max-w-full min-w-0 overflow-x-hidden border-y px-5 py-3 shadow-[0_8px_18px_rgb(62_42_34_/_0.06)] backdrop-blur sm:mx-0 sm:w-full sm:rounded-[var(--seraya-radius-lg)] sm:border sm:px-4 lg:hidden"
          data-invitation-editor-mobile-navigation
          data-release-b-studio-navigation="rb1"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.08em] uppercase">
                Bagian {activeIndex + 1} dari {invitationStudioChapters.length}
              </p>
              <p className="text-seraya-text-primary mt-0.5 truncate text-sm font-semibold">
                {active.studioLabel}
              </p>
              <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                {progressCopy}
              </p>
            </div>
            <SectionState current status={statuses[activeSection]} />
          </div>

          <div
            aria-label="Pindah bagian"
            className="-mx-1 mt-2.5 flex snap-x [scrollbar-width:none] gap-1.5 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
            data-invitation-editor-mobile-section-strip
            role="list"
          >
            {invitationStudioChapters.map((section) => {
              const current = section.key === activeSection;

              return (
                <div className="snap-start" key={section.key} role="listitem">
                  <SectionButton
                    current={current}
                    onSelect={onSelect}
                    section={section}
                    status={statuses[section.key]}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              className="border-seraya-border-default text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              disabled={activeIndex === 0}
              onClick={() => {
                const previous = invitationStudioChapters[activeIndex - 1];
                if (previous) onSelect(previous.key);
              }}
              type="button"
            >
              Sebelumnya
            </button>
            <button
              className="bg-seraya-brand-soft text-seraya-action-primary focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              disabled={
                activeIndex === invitationStudioChapters.length - 1
              }
              onClick={() => {
                const next = invitationStudioChapters[activeIndex + 1];
                if (next) onSelect(next.key);
              }}
              type="button"
            >
              Berikutnya
            </button>
          </div>
        </nav>

        <nav
          aria-label="Bagian undangan"
          className="border-seraya-border-default bg-seraya-surface sticky top-20 hidden max-h-[calc(100svh-6rem)] self-start overflow-y-auto rounded-[var(--seraya-radius-lg)] border p-2.5 shadow-[var(--seraya-shadow-soft)] lg:block"
          data-invitation-editor-desktop-navigation
          data-release-b-studio-navigation="rb1"
        >
          <div className="border-seraya-border-default border-b px-2.5 pt-1.5 pb-3">
            <p className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.08em] uppercase">
              Studio undangan
            </p>
            <p className="text-seraya-text-primary mt-1 text-sm font-semibold">
              9 bab perjalanan
            </p>
            <p className="text-seraya-text-muted mt-1 text-xs leading-5">
              {progressCopy}
            </p>
            <p className="text-seraya-text-muted mt-1 text-[0.7rem] leading-5">
              Status draft tersimpan
            </p>
          </div>
          <ol className="mt-2 space-y-0.5">
            {invitationStudioChapters.map((section) => {
              const current = section.key === activeSection;

              return (
                <li key={section.key}>
                  <button
                    aria-controls={`invitation-editor-panel-${section.key}`}
                    aria-current={current ? 'step' : undefined}
                    className={[
                      'focus-visible:outline-seraya-focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-[var(--seraya-radius-md)] px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-3 focus-visible:outline-offset-2',
                      current
                        ? 'bg-seraya-brand-soft text-seraya-action-primary font-semibold'
                        : 'text-seraya-text-secondary hover:bg-seraya-canvas hover:text-seraya-text-primary',
                    ].join(' ')}
                    data-invitation-editor-chapter={section.key}
                    onClick={() => onSelect(section.key)}
                    type="button"
                  >
                    <SectionState
                      current={current}
                      status={statuses[section.key]}
                    />
                    <span className="min-w-0 flex-1 truncate leading-5">
                      {section.studioLabel}
                    </span>
                    <span className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.06em]">
                      {section.number}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </>
    );
  },
);

function getCanonicalPanelChildren(
  children: ReactNode,
  section: InvitationEditorSectionKey,
): ReactNode {
  const chapter = invitationEditorSections.find(
    (candidate) => candidate.key === section,
  );

  if (
    !chapter ||
    !isValidElement<{ number?: string; title?: string }>(children) ||
    children.props.number === undefined ||
    children.props.title === undefined
  ) {
    return children;
  }

  return cloneElement(children, {
    number: chapter.number,
    title: chapter.editorTitle,
  });
}

export function InvitationWorkspacePanel({
  active,
  children,
  section,
}: {
  active: boolean;
  children: ReactNode;
  section: InvitationEditorSectionKey;
}) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="max-w-full min-w-0"
      data-invitation-editor-panel={section}
      data-invitation-editor-panel-active={active ? 'true' : 'false'}
      data-release-b-studio-panel="rb1"
      hidden={!active}
      id={`invitation-editor-panel-${section}`}
    >
      {getCanonicalPanelChildren(children, section)}
    </div>
  );
}
