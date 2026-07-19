import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import {
  filterGuestFollowUpRows,
  GuestFollowUpCenter,
} from '@/components/projects/guest-follow-up-center';
import { initialGuestFollowUpHandoffActionState } from '@/modules/follow-up/follow-up.action-state';

const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function prepareHandoff() {
  return initialGuestFollowUpHandoffActionState;
}

const summary = {
  activeGuestCount: 6,
  awaitingRsvpCount: 1,
  needsDataRepairCount: 2,
  needsLinkUpdateCount: 1,
  needsPreparationCount: 1,
  needsWhatsAppCount: 1,
  noFollowUpRecordedCount: 1,
  noPersonalInvitationCount: 1,
  rsvpRespondedCount: 1,
};

type Row = ComponentProps<typeof GuestFollowUpCenter>['rows'][number];

function createRow(overrides: Partial<Row>): Row {
  return {
    displayName: 'Keluarga Budi',
    eligibility: {
      canPrepareEventReminder: false,
      canPrepareInitialInvitation: false,
      canPrepareRsvpReminder: false,
    },
    followUpCount: 0,
    followUpSegment: 'needs_link_update',
    groupLabel: 'Keluarga',
    guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    lastFollowUpAt: null,
    lastMessageKind: null,
    maskedWhatsAppNumber: '+62••••7890',
    personalLinkReaccessState: 'legacy',
    personalLinkState: 'active',
    rsvpStatus: 'pending',
    whatsappAvailability: 'available',
    ...overrides,
  };
}

const rows: Row[] = [
  createRow({ displayName: 'Alya', followUpSegment: 'needs_link_update' }),
  createRow({
    displayName: 'Bima',
    followUpSegment: 'needs_whatsapp',
    guestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    maskedWhatsAppNumber: null,
    whatsappAvailability: 'missing',
  }),
  createRow({
    displayName: 'Citra',
    followUpSegment: 'no_personal_invitation',
    guestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    personalLinkReaccessState: 'unavailable',
    personalLinkState: 'not_created',
  }),
  createRow({
    displayName: 'Dimas',
    eligibility: {
      canPrepareEventReminder: true,
      canPrepareInitialInvitation: false,
      canPrepareRsvpReminder: false,
    },
    followUpCount: 2,
    followUpSegment: 'rsvp_responded',
    guestId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    handoffAction: prepareHandoff,
    lastFollowUpAt: '2027-08-16T03:00:00.000Z',
    lastMessageKind: 'rsvp_reminder',
    rsvpStatus: 'attending',
  }),
  createRow({
    displayName: 'Eka',
    eligibility: {
      canPrepareEventReminder: false,
      canPrepareInitialInvitation: true,
      canPrepareRsvpReminder: false,
    },
    followUpSegment: 'no_follow_up_recorded',
    guestId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    handoffAction: prepareHandoff,
  }),
  createRow({
    displayName: 'Fajar',
    eligibility: {
      canPrepareEventReminder: false,
      canPrepareInitialInvitation: false,
      canPrepareRsvpReminder: true,
    },
    followUpCount: 1,
    followUpSegment: 'awaiting_rsvp',
    guestId: '11111111-1111-4111-8111-111111111111',
    handoffAction: prepareHandoff,
    lastFollowUpAt: '2027-08-15T03:00:00.000Z',
    lastMessageKind: 'initial_invitation',
  }),
];

function renderCenter(overrides: Partial<ComponentProps<typeof GuestFollowUpCenter>> = {}) {
  return renderToStaticMarkup(
    <GuestFollowUpCenter
      isPublished
      projectId={projectId}
      rows={rows}
      summary={summary}
      timezone="Asia/Jakarta"
      {...overrides}
    />,
  );
}

describe('Guest Follow-up Slice D workspace UI', () => {
  it('renders the canonical header, global summary, six exclusive filters, safe rows, and manual handoff actions', () => {
    const html = renderCenter();

    expect(html).toContain('Tindak lanjut tamu');
    expect(html).toContain('Seraya tidak menganggap pesan sudah terkirim.');
    for (const label of [
      'Tamu aktif',
      'Perlu diperbaiki',
      'Belum ditindaklanjuti',
      'Menunggu RSVP',
      'RSVP selesai',
    ]) {
      expect(html).toContain(label);
    }
    for (const label of [
      'Tautan perlu diperbarui',
      'Butuh nomor WhatsApp',
      'Belum punya Undangan Pribadi',
      'Belum pernah ditindaklanjuti',
      'Menunggu RSVP',
      'RSVP sudah dijawab',
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Siapkan undangan awal');
    expect(html).toContain('Siapkan pengingat RSVP');
    expect(html).toContain('Siapkan pengingat acara');
    expect(html).toContain('Buka Tamu');
    expect(html).toContain('Buka Bagikan');
    expect(html).toContain('+62••••7890');
    expect(html).not.toContain('+6281234567890');
    expect(html).not.toContain('Pesan sudah terkirim');
    expect(html).not.toContain('Dibaca');
    expect(html).not.toContain('Kirim otomatis');
  });

  it('keeps the unpublished state visible and replaces eligible handoffs with a publication handoff', () => {
    const html = renderCenter({ isPublished: false });

    expect(html).toContain('Publikasikan undangan untuk mulai menyiapkan handoff');
    expect(html).toContain(`href="/dashboard/${projectId}/invitation"`);
    expect(html).toContain('Publikasikan undangan');
    expect(html).not.toContain('Siapkan pengingat RSVP');
    expect(html).not.toContain('Siapkan pengingat acara');
  });

  it('filters by the exact Slice B segment and searches guest name or group', () => {
    expect(filterGuestFollowUpRows(rows, 'all', '')).toHaveLength(6);
    expect(filterGuestFollowUpRows(rows, 'needs_whatsapp', '')).toEqual([
      expect.objectContaining({ displayName: 'Bima' }),
    ]);
    expect(filterGuestFollowUpRows(rows, 'rsvp_responded', 'dimas')).toEqual([
      expect.objectContaining({ displayName: 'Dimas' }),
    ]);
    expect(filterGuestFollowUpRows(rows, 'awaiting_rsvp', 'keluarga')).toEqual([
      expect.objectContaining({ displayName: 'Fajar' }),
    ]);
    expect(filterGuestFollowUpRows(rows, 'needs_link_update', 'teman')).toEqual([]);
  });

  it('renders the no-guest state with a Tamu handoff and no misleading messaging claim', () => {
    const html = renderCenter({
      rows: [],
      summary: { ...summary, activeGuestCount: 0 },
    });

    expect(html).toContain('Belum ada tamu untuk ditindaklanjuti.');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).not.toContain('berhasil dikirim');
  });

  it('keeps temporary handoff material in the result dialog and never introduces automation or persistence code into the workspace', async () => {
    const [centerSource, resultSource, actionSource] = await Promise.all([
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/guest-follow-up-center.tsx'),
        'utf8',
      ),
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/guest-follow-up-result-dialog.tsx'),
        'utf8',
      ),
      readFile(path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.actions.ts'), 'utf8'),
    ]);

    expect(resultSource).toContain('Buka WhatsApp');
    expect(resultSource).toContain('Copy pesan');
    expect(resultSource).toContain('Pesan belum dianggap terkirim');
    expect(centerSource).not.toContain('whatsapp_phone_e164');
    expect(centerSource).not.toContain('createAdminSupabaseClient');
    expect(centerSource).not.toContain('setInterval');
    expect(centerSource).not.toContain('schedule');
    expect(actionSource).toContain('revalidatePath(`/dashboard/${projectId}/follow-up`)');
  });
});
