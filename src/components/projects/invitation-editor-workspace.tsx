import type { ReactNode } from 'react';

import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

export const invitationEditorSections = [
  { key: 'style', label: 'Gaya undangan', number: '01' },
  { key: 'opening', label: 'Pembuka', number: '02' },
  { key: 'couple', label: 'Mempelai', number: '03' },
  { key: 'story', label: 'Cerita', number: '04' },
  { key: 'schedule', label: 'Rangkaian acara', number: '05' },
  { key: 'gallery', label: 'Galeri', number: '06' },
  { key: 'rsvp', label: 'Konfirmasi tamu', number: '07' },
  { key: 'gift', label: 'Amplop Digital', number: '08' },
  { key: 'closing', label: 'Penutup', number: '09' },
] as const;

export type InvitationEditorSectionKey = (typeof invitationEditorSections)[number]['key'];
export type InvitationEditorSectionStatus = 'complete' | 'error' | 'incomplete' | 'optional_off';

export type InvitationEditorSectionStatuses = Record<
  InvitationEditorSectionKey,
  InvitationEditorSectionStatus
>;

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

export function getInvitationEditorErrorSections(errors?: InvitationEditorFieldErrors) {
  const sectionsWithErrors = getSectionsWithErrors(errors);

  return invitationEditorSections
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
      hasText(content.couple.personOne.displayName) && hasText(content.couple.personTwo.displayName)
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
        (event) => hasText(event.title) && hasText(event.date) && hasText(event.startTime),
      )
        ? 'complete'
        : 'incomplete',
    gallery:
      content.gallery.enabled && content.gallery.imageIds.length > 0 ? 'complete' : 'optional_off',
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
      onClick={() => onSelect(section.key)}
      type="button"
    >
      <SectionState current={current} status={status} />
      <span className="whitespace-nowrap">
        <span className="text-seraya-text-muted mr-1.5 text-[0.68rem] font-bold tracking-[0.06em]">
          {section.number}
        </span>
        {section.label}
      </span>
    </button>
  );
}

export function InvitationWorkspaceNavigation({
  activeSection,
  onSelect,
  statuses,
}: {
  activeSection: InvitationEditorSectionKey;
  onSelect: (section: InvitationEditorSectionKey) => void;
  statuses: InvitationEditorSectionStatuses;
}) {
  const activeIndex = invitationEditorSections.findIndex(
    (section) => section.key === activeSection,
  );
  const active = invitationEditorSections[activeIndex] ?? invitationEditorSections[0];

  return (
    <>
      <nav
        aria-label="Bagian undangan"
        className="border-seraya-border-default bg-seraya-surface/95 sticky top-16 z-20 -mx-5 border-y px-5 py-3 shadow-[0_8px_18px_rgb(62_42_34_/_0.06)] backdrop-blur sm:mx-0 sm:rounded-[var(--seraya-radius-lg)] sm:border sm:px-4 lg:hidden"
        data-invitation-editor-mobile-navigation
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.08em] uppercase">
              Bagian {activeIndex + 1} dari {invitationEditorSections.length}
            </p>
            <p className="text-seraya-text-primary mt-0.5 truncate text-sm font-semibold">
              {active.label}
            </p>
          </div>
          <SectionState current status={statuses[activeSection]} />
        </div>

        <div
          aria-label="Pindah bagian"
          className="-mx-1 mt-2.5 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-invitation-editor-mobile-section-strip
          role="list"
        >
          {invitationEditorSections.map((section) => {
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
              const previous = invitationEditorSections[activeIndex - 1];
              if (previous) onSelect(previous.key);
            }}
            type="button"
          >
            Sebelumnya
          </button>
          <button
            className="bg-seraya-brand-soft text-seraya-action-primary focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            disabled={activeIndex === invitationEditorSections.length - 1}
            onClick={() => {
              const next = invitationEditorSections[activeIndex + 1];
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
      >
        <div className="px-2.5 pt-1.5 pb-2">
          <p className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.08em] uppercase">
            Susunan undangan
          </p>
          <p className="text-seraya-text-muted mt-1 text-xs leading-5">
            Status draft tersimpan
          </p>
        </div>
        <ol className="space-y-0.5">
          {invitationEditorSections.map((section) => {
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
                  onClick={() => onSelect(section.key)}
                  type="button"
                >
                  <SectionState current={current} status={statuses[section.key]} />
                  <span className="min-w-0 flex-1 truncate leading-5">{section.label}</span>
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
  return (
    <div
      data-invitation-editor-panel={section}
      data-invitation-editor-panel-active={active ? 'true' : 'false'}
      hidden={!active}
      id={`invitation-editor-panel-${section}`}
    >
      {children}
    </div>
  );
}
