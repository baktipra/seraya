'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { GuestbookInboxPanel } from '@/components/projects/guestbook-dashboard';
import {
  OperationalDataSurface,
  OperationalDesktopData,
  OperationalEmptyState,
  OperationalHeader,
  OperationalMetric,
  OperationalMetricStrip,
  OperationalMobileDataCard,
  OperationalMobileDataList,
  OperationalMobileField,
  OperationalSection,
  OperationalToolbar,
  OperationalToolbarField,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { Button, Input } from '@/design-system';
import type { OwnerGuestbookEntry } from '@/modules/guestbook/guestbook.types';
import type {
  RsvpAnalyticsViewModel,
  RsvpResponseRow,
} from '@/modules/guests/rsvp-analytics.types';

export type RsvpResponseFilter = 'all' | 'attending' | 'declined' | 'pending';
type ResponseTab = 'responses' | 'guestbook';

type GuestResponseWorkspaceProps = {
  analytics: RsvpAnalyticsViewModel;
  entries: OwnerGuestbookEntry[];
  initialTab?: ResponseTab;
  projectId: string;
  timezone: string;
};

const rsvpStatusLabels: Record<RsvpResponseRow['rsvpStatus'], string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

const rsvpStatusClasses: Record<RsvpResponseRow['rsvpStatus'], string> = {
  attending:
    'border-[color-mix(in_srgb,var(--seraya-status-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--seraya-status-success)_10%,transparent)] text-seraya-status-success',
  declined: 'border-seraya-border-default bg-seraya-canvas text-seraya-text-secondary',
  pending:
    'border-[color-mix(in_srgb,var(--seraya-status-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--seraya-status-warning)_10%,transparent)] text-seraya-status-warning',
};

/** One pure UI derivation for the Responses search and RSVP-only filters. */
export function filterRsvpResponseRows(
  rows: readonly RsvpResponseRow[],
  filter: RsvpResponseFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');

  return rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      row.displayName.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
      row.groupLabel?.toLocaleLowerCase('id-ID').includes(normalizedQuery);

    if (!matchesQuery) return false;
    if (filter === 'pending') return row.rsvpStatus === 'pending';
    if (filter === 'attending') return row.rsvpStatus === 'attending';
    if (filter === 'declined') return row.rsvpStatus === 'declined';
    return true;
  });
}

function formatTimestamp(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return 'Tidak tersedia';
  }
}

function ResponseStatus({ status }: { status: RsvpResponseRow['rsvpStatus'] }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${rsvpStatusClasses[status]}`}
    >
      {rsvpStatusLabels[status]}
    </span>
  );
}

function downloadRsvpExport(projectId: string) {
  const anchor = document.createElement('a');
  anchor.href = `/dashboard/${projectId}/rsvp/export-xlsx`;
  anchor.download = 'seraya-respons-tamu.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getEmptyResponseMessage(filter: RsvpResponseFilter) {
  if (filter === 'pending') return 'Tidak ada tamu yang masih menunggu respons.';
  if (filter === 'attending') return 'Belum ada tamu yang mengonfirmasi hadir.';
  if (filter === 'declined') return 'Belum ada tamu yang mengonfirmasi tidak hadir.';
  return 'Tidak ada respons yang sesuai.';
}

function getAttendanceLabel(row: RsvpResponseRow) {
  if (row.rsvpStatus !== 'attending') return '—';
  if (row.rsvpAttendeeCount === null) return 'Belum dicantumkan';
  return `${row.rsvpAttendeeCount} orang`;
}

/** Owner-only monitoring workspace. Delivery, link lifecycle, and reminder actions intentionally do not exist here. */
export function GuestResponseWorkspace({
  analytics,
  entries,
  initialTab = 'responses',
  projectId,
  timezone,
}: GuestResponseWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>(initialTab);
  const [filter, setFilter] = useState<RsvpResponseFilter>('all');
  const [query, setQuery] = useState('');
  const responsesTabRef = useRef<HTMLButtonElement>(null);
  const guestbookTabRef = useRef<HTMLButtonElement>(null);

  const visibleRows = useMemo(
    () => filterRsvpResponseRows(analytics.responseRows, filter, query),
    [analytics.responseRows, filter, query],
  );
  const hasNoRecordedResponses = analytics.activeGuestCount > 0 && analytics.respondedCount === 0;
  const hasUnknownAttendanceCount = analytics.attendingCountUnknownGuestCount > 0;
  const attendanceDetail = hasUnknownAttendanceCount
    ? `${analytics.confirmedAttendeeCount} orang terkonfirmasi; ${analytics.attendingCountUnknownGuestCount} RSVP hadir belum mencantumkan jumlah.`
    : undefined;
  const attendanceValue = hasUnknownAttendanceCount
    ? 'Belum lengkap'
    : analytics.confirmedAttendeeCount;

  function activateTab(tab: ResponseTab, moveFocus = false) {
    setActiveTab(tab);

    if (moveFocus) {
      const target = tab === 'responses' ? responsesTabRef.current : guestbookTabRef.current;
      target?.focus();
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();

    if (event.key === 'Home' || event.key === 'ArrowLeft') {
      activateTab('responses', true);
      return;
    }

    activateTab('guestbook', true);
  }

  const tabActions = (
    <div aria-label="Tampilan Respons Tamu" className="flex gap-6" role="tablist">
      <button
        aria-controls="response-content"
        aria-selected={activeTab === 'responses'}
        className={`focus-visible:outline-seraya-focus-ring min-h-10 border-b-2 px-0 pb-2 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 ${
          activeTab === 'responses'
            ? 'border-seraya-action-primary text-seraya-action-primary'
            : 'text-seraya-text-muted border-transparent hover:text-seraya-text-primary'
        }`}
        id="response-tab"
        onClick={() => activateTab('responses')}
        onKeyDown={handleTabKeyDown}
        ref={responsesTabRef}
        role="tab"
        tabIndex={activeTab === 'responses' ? 0 : -1}
        type="button"
      >
        Respons
      </button>
      <button
        aria-controls="guestbook-content"
        aria-selected={activeTab === 'guestbook'}
        className={`focus-visible:outline-seraya-focus-ring min-h-10 border-b-2 px-0 pb-2 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 ${
          activeTab === 'guestbook'
            ? 'border-seraya-action-primary text-seraya-action-primary'
            : 'text-seraya-text-muted border-transparent hover:text-seraya-text-primary'
        }`}
        id="guestbook-tab-v2"
        onClick={() => activateTab('guestbook')}
        onKeyDown={handleTabKeyDown}
        ref={guestbookTabRef}
        role="tab"
        tabIndex={activeTab === 'guestbook' ? 0 : -1}
        type="button"
      >
        Ucapan
      </button>
    </div>
  );

  return (
    <OperationalWorkspace labelledBy="response-hub-title">
      <OperationalHeader
        actions={
          <Button
            aria-label="Export respons tamu ke XLSX"
            onClick={() => downloadRsvpExport(projectId)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Export XLSX
          </Button>
        }
        description="Pantau konfirmasi kehadiran, jumlah rombongan, dan ucapan tamu dalam satu tempat."
        eyebrow="Respons tamu"
        title="Respons & ucapan"
        titleId="response-hub-title"
      />

      <OperationalMetricStrip label="Ringkasan status RSVP">
        <OperationalMetric label="Hadir" value={analytics.attendingGuestCount} />
        <OperationalMetric label="Tidak hadir" value={analytics.declinedGuestCount} />
        <OperationalMetric label="Belum merespons" value={analytics.pendingGuestCount} />
        <OperationalMetric detail={attendanceDetail} label="Rombongan hadir" value={attendanceValue} />
      </OperationalMetricStrip>

      <OperationalSection
        actions={tabActions}
        description="Cari respons RSVP atau baca ucapan terbaru dari tamu."
        title="Pantauan respons"
        titleId="response-monitor-title"
      >
        {activeTab === 'responses' ? (
          <div aria-labelledby="response-tab" id="response-content" role="tabpanel">
            {analytics.activeGuestCount === 0 ? (
              <OperationalDataSurface>
                <OperationalEmptyState
                  action={
                    <Link
                      className="text-seraya-action-primary text-sm font-semibold underline-offset-4 hover:underline"
                      href={`/dashboard/${projectId}/guests`}
                    >
                      Buka Tamu →
                    </Link>
                  }
                  description="Tambahkan daftar tamu terlebih dahulu agar Anda dapat menerima RSVP."
                  title="Belum ada tamu untuk dipantau."
                />
              </OperationalDataSurface>
            ) : (
              <OperationalDataSurface>
                <OperationalToolbar>
                  <OperationalToolbarField htmlFor="response-search" label="Cari respons">
                    <Input
                      id="response-search"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari nama atau grup"
                      type="search"
                      value={query}
                    />
                  </OperationalToolbarField>
                  <OperationalToolbarField htmlFor="response-filter" label="Filter respons">
                    <select
                      className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                      id="response-filter"
                      onChange={(event) => setFilter(event.target.value as RsvpResponseFilter)}
                      value={filter}
                    >
                      <option value="all">Semua respons</option>
                      <option value="pending">Belum merespons</option>
                      <option value="attending">Hadir</option>
                      <option value="declined">Tidak hadir</option>
                    </select>
                  </OperationalToolbarField>
                </OperationalToolbar>

                {filter === 'pending' ? (
                  <p className="border-seraya-border-default text-seraya-text-muted border-b px-4 py-2.5 text-xs leading-5">
                    Daftar ini membantu Anda melihat tamu yang mungkin perlu ditindaklanjuti secara manual.
                  </p>
                ) : null}

                {hasNoRecordedResponses ? (
                  <div className="border-seraya-border-default border-b px-4 py-3">
                    <p className="text-seraya-text-primary text-sm font-semibold">Belum ada respons masuk.</p>
                    <p className="text-seraya-text-secondary mt-1 text-xs leading-5">
                      Respons akan muncul ketika tamu mengisi kehadiran melalui Undangan Pribadi.
                    </p>
                  </div>
                ) : null}

                {visibleRows.length === 0 ? (
                  <OperationalEmptyState
                    description="Ubah pencarian atau filter untuk melihat respons lain."
                    title={getEmptyResponseMessage(filter)}
                  />
                ) : (
                  <>
                    <OperationalDesktopData>
                      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <thead className="bg-seraya-brand-soft text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.12em] uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Tamu</th>
                            <th className="px-4 py-2.5">Grup</th>
                            <th className="px-4 py-2.5">Status RSVP</th>
                            <th className="px-4 py-2.5 text-right">Rombongan</th>
                            <th className="px-4 py-2.5">Diperbarui</th>
                          </tr>
                        </thead>
                        <tbody className="divide-seraya-border-default divide-y">
                          {visibleRows.map((row) => (
                            <tr className="hover:bg-seraya-canvas transition-colors" key={row.guestId}>
                              <td className="text-seraya-text-primary px-4 py-3 font-semibold">
                                {row.displayName}
                              </td>
                              <td className="text-seraya-text-muted px-4 py-3 text-xs">
                                {row.groupLabel ?? '—'}
                              </td>
                              <td className="px-4 py-3">
                                <ResponseStatus status={row.rsvpStatus} />
                              </td>
                              <td
                                className={`px-4 py-3 text-right text-xs tabular-nums ${
                                  row.rsvpStatus === 'attending' && row.rsvpAttendeeCount === null
                                    ? 'text-seraya-status-warning font-semibold'
                                    : 'text-seraya-text-secondary'
                                }`}
                              >
                                {getAttendanceLabel(row)}
                              </td>
                              <td className="text-seraya-text-muted px-4 py-3 text-xs">
                                {formatTimestamp(row.updatedAt, timezone)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </OperationalDesktopData>

                    <OperationalMobileDataList>
                      {visibleRows.map((row) => (
                        <OperationalMobileDataCard
                          identity={
                            <>
                              <p className="text-seraya-text-primary truncate font-semibold">
                                {row.displayName}
                              </p>
                              <p className="text-seraya-text-muted mt-0.5 text-xs">
                                {row.groupLabel ?? 'Tanpa grup'}
                              </p>
                            </>
                          }
                          key={row.guestId}
                          status={<ResponseStatus status={row.rsvpStatus} />}
                        >
                          <dl data-operational-mobile-fields>
                            <OperationalMobileField
                              label="Rombongan"
                              value={getAttendanceLabel(row)}
                            />
                            <OperationalMobileField
                              align="end"
                              label="Diperbarui"
                              value={formatTimestamp(row.updatedAt, timezone)}
                            />
                          </dl>
                        </OperationalMobileDataCard>
                      ))}
                    </OperationalMobileDataList>
                  </>
                )}
              </OperationalDataSurface>
            )}
          </div>
        ) : (
          <div aria-labelledby="guestbook-tab-v2" id="guestbook-content" role="tabpanel">
            <OperationalDataSurface>
              <GuestbookInboxPanel entries={entries} timezone={timezone} />
            </OperationalDataSurface>
          </div>
        )}
      </OperationalSection>
    </OperationalWorkspace>
  );
}
