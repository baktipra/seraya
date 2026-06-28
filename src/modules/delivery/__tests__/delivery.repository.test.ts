import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseClientMock, eqMock, inMock, selectMock } = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  eqMock: vi.fn(),
  inMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock('@/server/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { listDeliveryGuestSelectionEligibilityForVerifiedProject } from '../delivery.repository';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'published',
};

const guestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('delivery selected-guest eligibility projection', () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
    eqMock.mockReset();
    inMock.mockReset();
    selectMock.mockReset();
    createServerSupabaseClientMock.mockResolvedValue({
      from: vi.fn(() => ({ select: selectMock })),
    });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ in: inMock });
  });

  it('queries only selected IDs constrained to the verified project and exposes no guest content', async () => {
    inMock.mockResolvedValue({ data: [{ deleted_at: null, id: guestId }], error: null });

    await expect(
      listDeliveryGuestSelectionEligibilityForVerifiedProject(project, [guestId]),
    ).resolves.toEqual([{ deleted_at: null, id: guestId }]);

    expect(selectMock).toHaveBeenCalledWith('id, deleted_at');
    expect(eqMock).toHaveBeenCalledWith('project_id', project.id);
    expect(inMock).toHaveBeenCalledWith('id', [guestId]);
  });

  it('does not query when no selection requires an eligibility classification', async () => {
    await expect(
      listDeliveryGuestSelectionEligibilityForVerifiedProject(project, []),
    ).resolves.toEqual([]);
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });
});
