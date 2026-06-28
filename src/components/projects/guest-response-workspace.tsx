'use client';

import { useMemo, useState } from 'react';

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

type ResponseFilter = 'all' | 'attending' | 'declined' | 'guestbook' | 'pending';
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-seraya-border-default bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-md)] border px-4 py-4">
      <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="text-seraya-text-primary mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
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

/** Owner-only response workspace. Delivery and guest-link actions intentionally do not exist here. */
export function GuestResponseWorkspace({
  analytics,
  entries,
  initialTab = 'responses',
  projectId,
  timezone,
}: GuestResponseWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>(initialTab);
  const [filter, setFilter] = useState<ResponseFilter>('all');
  const [query, setQuery] = useState('');
  const guestbookGuestIds = useMemo(
    () => new Set(entries.flatMap((entry) => (entry.guestId ? [entry.guestId] : []))),
    [entries],
  );

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return analytics.responseRows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.displayName.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        row.groupLabel?.toLocaleLowerCase('id-ID').includes(normalizedQuery);
      if (!matchesQuery) return false;
      if (filter === 'pending') return row.rsvpStatus === 'pending';
      if (filter === 'attending') return row.rsvpStatus === 'attending';
      if (filter === 'declined') return row.rsvpStatus === 'declined';
      if (filter === 'guestbook') return guestbookGuestIds.has(row.guestId);
      return true;
    });
  }, [analytics.responseRows, filter, guestbookGuestIds, query]);

  return (
    <section
      aria-labelledby="guest-response-workspace-title"
      className="mx-auto max-w-7xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Respons Tamu
        </p>
        <h1 className="seraya-display-md mt-3" id="guest-response-workspace-title">
          Pantau respons dan ucapan tamu
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
          Lihat siapa yang hadir, siapa yang belum merespons, dan ucapan yang masuk melalui Undangan
          Pribadi.
        </p>
      </header>

      <section aria-label="Ringkasan RSVP" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Hadir" value={analytics.attendingGuestCount} />
        <Metric label="Tidak hadir" value={analytics.declinedGuestCount} />
        <Metric label="Belum merespons" value={analytics.pendingGuestCount} />
        <Metric label="Total rombongan hadir" value={analytics.confirmedAttendeeCount} />
      </section>

      <Card aria-labelledby="guest-response-tabs-title">
        <CardHeader className="gap-4">
          <div>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="guest-response-tabs-title"
            >
              Respons dan ucapan
            </CardTitle>
            <CardDescription>
              RSVP dan ucapan berada dalam satu rumah, tanpa aksi distribusi atau lifecycle tautan.
            </CardDescription>
          </div>
          <div aria-label="Tampilan Respons Tamu" className="flex flex-wrap gap-2" role="tablist">
            <Button
              aria-controls="response-panel"
              aria-selected={activeTab === 'responses'}
              id="responses-tab"
              onClick={() => setActiveTab('responses')}
              role="tab"
              size="sm"
              type="button"
              variant={activeTab === 'responses' ? 'primary' : 'secondary'}
            >
              Respons
            </Button>
            <Button
              aria-controls="guestbook-panel"
              aria-selected={activeTab === 'guestbook'}
              id="guestbook-tab"
              onClick={() => setActiveTab('guestbook')}
              role="tab"
              size="sm"
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
              id="response-panel"
              role="tabpanel"
              className="space-y-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_15rem] lg:max-w-2xl">
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
                      onChange={(event) => setFilter(event.target.value as ResponseFilter)}
                      value={filter}
                    >
                      <option value="all">Semua respons</option>
                      <option value="pending">Belum merespons</option>
                      <option value="attending">Hadir</option>
                      <option value="declined">Tidak hadir</option>
                      <option value="guestbook">Ada ucapan</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => downloadRsvpExport(projectId)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Export RSVP
                  </Button>
                  <Button
                    onClick={() => setFilter('pending')}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Lihat follow-up manual
                  </Button>
                  <Button
                    onClick={() => setActiveTab('guestbook')}
                    size="sm"
                    type="button"
                    variant="text"
                  >
                    Baca ucapan
                  </Button>
                </div>
              </div>

              {visibleRows.length === 0 ? (
                <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
                  <p className="text-seraya-text-primary font-semibold">
                    Tidak ada respons yang sesuai.
                  </p>
                  <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                    Ubah pencarian atau filter untuk melihat respons lain.
                  </p>
                </div>
              ) : (
                <div className="border-seraya-border-default overflow-x-auto rounded-[var(--seraya-radius-md)] border">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Tamu</th>
                        <th className="px-3 py-2.5">Grup</th>
                        <th className="px-3 py-2.5">Status RSVP</th>
                        <th className="px-3 py-2.5 text-right">Rombongan Hadir</th>
                        <th className="px-3 py-2.5">Terakhir diperbarui</th>
                        <th className="px-3 py-2.5">Ucapan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                      {visibleRows.map((row) => (
                        <tr key={row.guestId}>
                          <td className="text-seraya-text-primary px-3 py-3 align-top font-semibold">
                            {row.displayName}
                          </td>
                          <td className="text-seraya-text-secondary px-3 py-3 align-top">
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
                          <td className="text-seraya-text-secondary px-3 py-3 align-top">
                            {guestbookGuestIds.has(row.guestId) ? 'Ada ucapan' : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div aria-labelledby="guestbook-tab" id="guestbook-panel" role="tabpanel">
              <GuestbookInboxPanel entries={entries} projectId={projectId} timezone={timezone} />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
