import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prepareMock, reaccessMock } = vi.hoisted(() => ({
  prepareMock: vi.fn(),
  reaccessMock: vi.fn(),
}));

vi.mock('@/modules/delivery/delivery.actions', () => ({
  reaccessPersonalGuestLinkForDeliveryAction: reaccessMock,
}));
vi.mock('@/modules/follow-up/follow-up.service', async (original) => {
  const actual = await original<typeof import('@/modules/follow-up/follow-up.service')>();
  return { ...actual, prepareGuestFollowUpHandoffForCurrentUser: prepareMock };
});

import { initialDeliveryLinkActionState } from '@/modules/delivery/delivery.action-state';
import { reaccessOrPrepareCanonicalInitialHandoffAction } from '@/modules/delivery/canonical-initial-handoff.actions';
import { GuestFollowUpHandoffNotEligibleError } from '@/modules/follow-up/follow-up.service';

const bound = { guestId: 'guest-id', projectId: 'project-id' };
const form = (operation: string) => {
  const value = new FormData();
  value.set('operation', operation);
  return value;
};

describe('canonical initial handoff adapter', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    reaccessMock
      .mockReset()
      .mockResolvedValue({ personalUrl: 'https://example.test/g', status: 'success' });
  });

  it('delegates Copy/Open without recording follow-up', async () => {
    await reaccessOrPrepareCanonicalInitialHandoffAction(
      bound,
      initialDeliveryLinkActionState,
      form('copy'),
    );
    expect(reaccessMock).toHaveBeenCalledOnce();
    expect(prepareMock).not.toHaveBeenCalled();
  });

  it('uses Slice C authority for the first WhatsApp share', async () => {
    prepareMock.mockResolvedValue({
      personalUrl: 'https://example.test/g',
      whatsappComposeUrl: 'https://wa.me/62811111111?text=hello',
    });
    const result = await reaccessOrPrepareCanonicalInitialHandoffAction(
      bound,
      initialDeliveryLinkActionState,
      form('share'),
    );
    expect(prepareMock).toHaveBeenCalledWith({ ...bound, messageKind: 'initial_invitation' });
    expect(result).toMatchObject({
      personalUrl: 'https://example.test/g',
      recipientWhatsAppPhoneE164: '+62811111111',
      status: 'success',
    });
  });

  it('allows repeat manual sharing without fabricating another initial event', async () => {
    prepareMock.mockRejectedValue(new GuestFollowUpHandoffNotEligibleError());
    await reaccessOrPrepareCanonicalInitialHandoffAction(
      bound,
      initialDeliveryLinkActionState,
      form('share'),
    );
    expect(reaccessMock).toHaveBeenCalledOnce();
  });
});
