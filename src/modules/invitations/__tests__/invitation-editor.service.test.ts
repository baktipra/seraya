import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '../invitation-draft.defaults';
import {
  parseInvitationEditorFormData,
  type InvitationEditorFormInput,
} from '../invitation-editor.schema';
import {
  InvitationEditorDraftUnavailableError,
  InvitationEditorValidationError,
  getInvitationEditorForCurrentUser,
  saveInvitationEditorDraftForCurrentUser,
} from '../invitation-editor.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getActiveDraftMock, getOwnedProjectMock, requireCurrentUserMock, updateActiveDraftMock } =
  vi.hoisted(() => ({
    getActiveDraftMock: vi.fn(),
    getOwnedProjectMock: vi.fn(),
    requireCurrentUserMock: vi.fn(),
    updateActiveDraftMock: vi.fn(),
  }));

vi.mock('@/modules/auth/current-user', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));

vi.mock('../invitation-draft.repository', () => ({
  getActiveInvitationDraftForVerifiedProject: getActiveDraftMock,
  updateActiveInvitationDraftForVerifiedProject: updateActiveDraftMock,
}));

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: projectId,
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

function createEditorInput(): InvitationEditorFormInput {
  return {
    content: {
      closing: { enabled: false, message: '', signature: '' },
      digitalGift: {
        accounts: [
          {
            accountHolder: ' Raka Pratama ',
            accountNumber: '1234 5678-9012',
            id: '11111111-1111-4111-8111-111111111111',
            providerName: ' Bank Seraya ',
          },
        ],
        enabled: true,
        heading: ' Amplop Digital ',
        lead: ' Terima kasih atas doa terbaik Anda. ',
      },
      couple: {
        personOne: { displayName: ' Raka ', fullName: ' ', parentLine: ' ' },
        personTwo: { displayName: ' Nadia ', fullName: '', parentLine: '' },
      },
      eventSchedule: {
        events: [
          {
            date: '2027-08-17',
            endTime: ' 11:00 ',
            id: '22222222-2222-4222-8222-222222222222',
            mapsUrl: ' https://maps.example.test/raka-nadia ',
            startTime: ' 08:00 ',
            title: ' Akad Nikah ',
            venueAddress: ' Jalan Mawar ',
            venueName: ' Gedung Bahagia ',
          },
          {
            date: '2027-08-17',
            endTime: '',
            id: '33333333-3333-4333-8333-333333333333',
            mapsUrl: '',
            startTime: ' 18:30 ',
            title: ' Resepsi ',
            venueAddress: '',
            venueName: '',
          },
        ],
      },
      hero: { eyebrow: ' The Wedding Of ', subtitle: ' ', title: ' Raka & Nadia ' },
      paletteKey: 'matcha',
      rsvp: { enabled: true, heading: ' Konfirmasi Kehadiran ', lead: ' ' },
      templateKey: 'aruna',
      story: { body: ' ', enabled: false, heading: '' },
    },
    projectId,
  };
}

function createDraft() {
  const content = createDefaultInvitationDraftContent(project);
  content.gallery = {
    enabled: true,
    imageIds: ['11111111-1111-4111-8111-111111111111'],
  };

  return {
    content,
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    project_id: project.id,
    schema_version: 1,
    updated_at: '2026-06-20T00:00:00.000Z',
  };
}

describe('SRY-016 invitation editor service', () => {
  beforeEach(() => {
    getActiveDraftMock.mockReset();
    getOwnedProjectMock.mockReset();
    requireCurrentUserMock.mockReset();
    updateActiveDraftMock.mockReset();
    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('freshly verifies ownership and updates only the active private draft with normalized content', async () => {
    const draft = createDraft();
    getActiveDraftMock.mockResolvedValue(draft);
    updateActiveDraftMock.mockImplementation(async ({ content, draft: currentDraft }) => ({
      ...currentDraft,
      content,
    }));

    const result = await saveInvitationEditorDraftForCurrentUser(createEditorInput());

    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectMock).toHaveBeenCalledWith(projectId, project.account_id);
    expect(getActiveDraftMock).toHaveBeenCalledWith(project);
    expect(updateActiveDraftMock).toHaveBeenCalledTimes(1);

    const update = updateActiveDraftMock.mock.calls[0]?.[0];
    expect(update.project).toBe(project);
    expect(update.draft).toBe(draft);
    expect(update.content.couple.personOne.displayName).toBe('Raka');
    expect(update.content.couple.personOne.fullName).toBeNull();
    expect(update.content.hero.subtitle).toBeNull();
    expect(update.content.story.body).toBeNull();
    expect(update.content.eventSchedule.events).toMatchObject([
      {
        date: '2027-08-17',
        endTime: '11:00',
        mapsUrl: 'https://maps.example.test/raka-nadia',
        startTime: '08:00',
        title: 'Akad Nikah',
        venueAddress: 'Jalan Mawar',
        venueName: 'Gedung Bahagia',
      },
      { title: 'Resepsi' },
    ]);
    expect(update.content.events.primaryDate).toBe('2027-08-17');
    expect(update.content.events.ceremony.title).toBe('Akad Nikah');
    expect(update.content.location.mapsUrl).toBe('https://maps.example.test/raka-nadia');
    expect(update.content.templateKey).toBe('aruna');
    expect(update.content.paletteKey).toBe('matcha');
    expect(update.content.digitalGift).toEqual({
      accounts: [
        {
          accountHolder: 'Raka Pratama',
          accountNumber: '123456789012',
          id: '11111111-1111-4111-8111-111111111111',
          providerName: 'Bank Seraya',
        },
      ],
      enabled: true,
      heading: 'Amplop Digital',
      lead: 'Terima kasih atas doa terbaik Anda.',
    });
    expect(update.content.meta).toEqual(draft.content.meta);
    expect(update.content.gallery).toEqual(draft.content.gallery);
    expect(result.content.gallery.imageIds).toEqual(draft.content.gallery.imageIds);
  });

  it('rejects invalid date, time, maps URL, and HTML-like content before any draft update', async () => {
    const draft = createDraft();
    getActiveDraftMock.mockResolvedValue(draft);
    const invalid = createEditorInput();
    invalid.content.eventSchedule.events[0]!.date = '2027-02-30';
    invalid.content.eventSchedule.events[0]!.startTime = '25:99';
    invalid.content.eventSchedule.events[0]!.mapsUrl = 'http://maps.example.test/not-https';
    invalid.content.story.body = '<strong>tidak boleh</strong>';
    invalid.content.digitalGift.accounts[0]!.accountNumber = '12/34';

    await expect(saveInvitationEditorDraftForCurrentUser(invalid)).rejects.toBeInstanceOf(
      InvitationEditorValidationError,
    );

    try {
      await saveInvitationEditorDraftForCurrentUser(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(InvitationEditorValidationError);
      const validationError = error as InvitationEditorValidationError;
      expect(validationError.fieldErrors['eventSchedule.events.0.date']).toBeDefined();
      expect(validationError.fieldErrors['eventSchedule.events.0.startTime']).toBeDefined();
      expect(validationError.fieldErrors['eventSchedule.events.0.mapsUrl']).toBeDefined();
      expect(validationError.fieldErrors['story.body']).toBeDefined();
      expect(validationError.fieldErrors['digitalGift.accounts.0.accountNumber']).toBeDefined();
    }

    expect(updateActiveDraftMock).not.toHaveBeenCalled();
  });

  it('does not load a draft or mutate it when project ownership is denied', async () => {
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(getInvitationEditorForCurrentUser(projectId)).rejects.toBeInstanceOf(
      ProjectAccessDeniedError,
    );

    expect(getActiveDraftMock).not.toHaveBeenCalled();
    expect(updateActiveDraftMock).not.toHaveBeenCalled();
  });

  it('treats an absent or soft-removed active draft as unavailable without metadata leakage', async () => {
    getActiveDraftMock.mockResolvedValue(null);

    await expect(getInvitationEditorForCurrentUser(projectId)).rejects.toBeInstanceOf(
      InvitationEditorDraftUnavailableError,
    );

    expect(updateActiveDraftMock).not.toHaveBeenCalled();
  });

  it('uses the existing strict form data shape so an injected editor key cannot be persisted', () => {
    const formData = new FormData();
    formData.set('unexpected', 'value');

    const parsed = parseInvitationEditorFormData(formData);
    expect(parsed.success).toBe(false);
  });
});
