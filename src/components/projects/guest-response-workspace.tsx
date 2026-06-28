'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { GuestbookInboxPanel } from '@/components/projects/guestbook-dashboard';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/design-system';
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

function Metric({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="border-seraya-border-default bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-md)] border px-4 py-4">
      <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="text-seraya-text-primary mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      {detail ? <p className="text-seraya-text-muted mt-2 text-xs leading-5">{detail}</p> : null}
    </div>
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
    ? `${analytics.confirmedAttendeeCount} orang sudah terkonfirmasi; ${analytics.attendingCountUnknownGuestCount} RSVP hadir belum mencantumkan jumlah.`
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

  return (
    <section
      aria-labelledby="guest-response-workspace-title"
      className="mx-auto max-w-7xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface flex flex-col gap-5 rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-8">
        <div>
          <h1 className="seraya-display-md" id="guest-response-workspace-title">
            Respons Tamu
          </h1>
          <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
            Pantau RSVP, jumlah rombongan hadir, dan ucapan dari tamu Anda.
          </p>
        </div>
        <Button
          aria-label="Export RSVP"
          className="shrink-0"
          onClick={() => downloadRsvpExport(projectId)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Export RSVP
        </Button>
      </header>

      <section aria-label="Ringkasan RSVP seluruh tamu aktif" className="space-y-3">
        <p className="text-seraya-text-muted text-sm">
          Ringkasan ini mencakup seluruh tamu aktif dan tidak berubah saat daftar difilter.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Hadir" value={analytics.attendingGuestCount} />
          <Metric label="Tidak hadir" value={analytics.declinedGuestCount} />
          <Metric label="Belum merespons" value={analytics.pendingGuestCount} />
          <Metric detail={attendanceDetail} label="Total rombongan hadir" value={attendanceValue} />
        </div>
      </section>

      <Card aria-labelledby="guest-response-tabs-title">
        <CardHeader className="gap-4">
          <div>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="guest-response-tabs-title"
            >
              Pantauan respons
            </CardTitle>
            <CardDescription>
              Gunakan tab untuk melihat status RSVP atau membaca ucapan terbaru dari tamu.
            </CardDescription>
          </div>
          <div aria-label="Tampilan Respons Tamu" className="flex gap-2" role="tablist">
            <Button
              aria-controls="response-panel"
              aria-selected={activeTab === 'responses'}
              id="responses-tab"
              onClick={() => activateTab('responses')}
              onKeyDown={handleTabKeyDown}
              ref={responsesTabRef}
              role="tab"
              size="sm"
              tabIndex={activeTab === 'responses' ? 0 : -1}
              type="button"
              variant={activeTab === 'responses' ? 'primary' : 'secondary'}
            >
              Respons
            </Button>
            <Button
              aria-controls="guestbook-panel"
              aria-selected={activeTab === 'guestbook'}
              id="guestbook-tab"
              onClick={() => activateTab('guestbook')}
              onKeyDown={handleTabKeyDown}
              ref={guestbookTabRef}
              role="tab"
              size="sm"
              tabIndex={activeTab === 'guestbook' ? 0 : -1}
              type="button"
              variant={activeTab === 'guestbook' ? 'primary' : 'secondary'}
            >
              Ucapan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          {activeTab === 'responses' ? (
            <div
              aria-labelledby="responses-tab"
              className="space-y-5"
              id="response-panel"
              role="tabpanel"
            >
              {analytics.activeGuestCount === 0 ? (
                <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
                  <p className="text-seraya-text-primary font-semibold">
                    Belum ada tamu untuk dipantau.
                  </p>
                  <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                    Tambahkan daftar tamu terlebih dahulu agar Anda dapat menerima RSVP.
                  </p>
                  <Link
                    className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] px-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                    href={`/dashboard/${projectId}/guests`}
                  >
                    Buka Tamu
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_15rem] lg:max-w-2xl">
                    <div className="space-y-2">
                      <label
                        className="text-seraya-text-primary text-sm font-semibold"
                        htmlFor="response-search"
                      >
                        Cari respons
                      </label>
                      <Input
                        id="response-search"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari nama atau grup"
                        type="search"
                        value={query}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-seraya-text-primary text-sm font-semibold"
                        htmlFor="response-filter"
                      >
                        Filter respons
                      </label>
                      <select
                        className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                        id="response-filter"
                        onChange={(event) => setFilter(event.target.value as RsvpResponseFilter)}
                        value={filter}
                      >
                        <option value="all">Semua respons</option>
                        <option value="pending">Belum merespons</option>
                        <option value="attending">Hadir</option>
                        <option value="declined">Tidak hadir</option>
                      </select>
                    </div>
                  </div>

                  {filter === 'pending' ? (
                    <p className="text-seraya-text-muted text-sm leading-6">
                      Daftar ini membantu Anda melihat tamu yang mungkin perlu ditindaklanjuti
                      secara manual.
                    </p>
                  ) : null}

                  {hasNoRecordedResponses ? (
                    <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border px-4 py-4">
                      <p className="text-seraya-text-primary text-sm font-semibold">
                        Belum ada respons masuk.
                      </p>
                      <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                        Respons akan muncul ketika tamu mengisi kehadiran melalui Undangan Pribadi.
                      </p>
                    </div>
                  ) : null}

                  {visibleRows.length === 0 ? (
                    <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
                      <p className="text-seraya-text-primary font-semibold">
                        {getEmptyResponseMessage(filter)}
                      </p>
                      <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                        Ubah pencarian atau filter untuk melihat respons lain.
                      </p>
                    </div>
                  ) : (
                    <div className="border-seraya-border-default overflow-x-auto rounded-[var(--seraya-radius-md)] border">
                      <table className="w-full min-w-[560px] border-collapse text-left text-sm sm:min-w-[680px]">
                        <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                          <tr>
                            <th className="px-3 py-2.5">Tamu</th>
                            <th className="hidden px-3 py-2.5 sm:table-cell">Grup</th>
                            <th className="px-3 py-2.5">Status RSVP</th>
                            <th className="px-3 py-2.5 text-right">Rombongan Hadir</th>
                            <th className="px-3 py-2.5">Terakhir diperbarui</th>
                          </tr>
                        </thead>
                        <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                          {visibleRows.map((row) => (
                            <tr key={row.guestId}>
                              <td className="text-seraya-text-primary px-3 py-3 align-top font-semibold">
                                <span>{row.displayName}</span>
                                {row.groupLabel ? (
                                  <span className="text-seraya-text-muted mt-1 block text-xs font-normal sm:hidden">
                                    {row.groupLabel}
                                  </span>
                                ) : null}
                              </td>
                              <td className="text-seraya-text-secondary hidden px-3 py-3 align-top sm:table-cell">
                                {row.groupLabel ?? '—'}
                              </td>
                              <td className="text-seraya-text-secondary px-3 py-3 align-top">
                                {rsvpStatusLabels[row.rsvpStatus]}
                              </td>
                              <td className="text-seraya-text-secondary px-3 py-3 text-right align-top tabular-nums">
                                {row.rsvpStatus === 'attending'
                                  ? row.rsvpAttendeeCount === null
                                    ? 'Belum dicantumkan'
                                    : `${row.rsvpAttendeeCount} orang`
                                  : '—'}
                              </td>
                              <td className="text-seraya-text-secondary px-3 py-3 align-top">
                                {formatTimestamp(row.updatedAt, timezone)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div aria-labelledby="guestbook-tab" id="guestbook-panel" role="tabpanel">
              <GuestbookInboxPanel entries={entries} timezone={timezone} />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
