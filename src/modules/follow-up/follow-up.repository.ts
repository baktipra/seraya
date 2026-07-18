import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';

import {
  guestFollowUpChannels,
  guestFollowUpEventTypes,
  guestFollowUpMessageKinds,
  type GuestFollowUpEvent,
  type GuestFollowUpEventDatabaseRecord,
  type GuestFollowUpMetadata,
} from './follow-up.types';

const followUpEventSelect =
  'id, project_id, guest_id, created_by, event_type, message_kind, channel, occurred_at, metadata';

export class GuestFollowUpRepositoryError extends Error {
  constructor() {
    super('The guest follow-up repository could not complete the request.');
    this.name = 'GuestFollowUpRepositoryError';
  }
}

function isGuestFollowUpEventType(value: string) {
  return guestFollowUpEventTypes.some((candidate) => candidate === value);
}

function isGuestFollowUpMessageKind(value: string) {
  return guestFollowUpMessageKinds.some((candidate) => candidate === value);
}

function isGuestFollowUpChannel(value: string) {
  return guestFollowUpChannels.some((candidate) => candidate === value);
}

function mapMetadata(value: unknown): GuestFollowUpMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.note_category === 'string'
      ? { noteCategory: record.note_category }
      : {}),
    ...(typeof record.source_surface === 'string'
      ? { sourceSurface: record.source_surface }
      : {}),
    ...(typeof record.template_version === 'string'
      ? { templateVersion: record.template_version }
      : {}),
  };
}

function mapGuestFollowUpEvent(record: GuestFollowUpEventDatabaseRecord): GuestFollowUpEvent {
  if (
    !isGuestFollowUpEventType(record.event_type) ||
    !isGuestFollowUpMessageKind(record.message_kind) ||
    !isGuestFollowUpChannel(record.channel)
  ) {
    throw new GuestFollowUpRepositoryError();
  }

  return {
    channel: record.channel,
    createdBy: record.created_by,
    eventType: record.event_type,
    guestId: record.guest_id,
    id: record.id,
    messageKind: record.message_kind,
    metadata: mapMetadata(record.metadata),
    occurredAt: record.occurred_at,
    projectId: record.project_id,
  } as GuestFollowUpEvent;
}

/** Owner-safe event history. The verified project remains an explicit filter even though the admin client bypasses RLS. */
export async function listGuestFollowUpEventsForVerifiedProject(
  project: OwnedProject,
): Promise<GuestFollowUpEvent[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guest_follow_up_events')
    .select(followUpEventSelect)
    .eq('project_id', project.id)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    throw new GuestFollowUpRepositoryError();
  }

  return (data ?? []).map((record) =>
    mapGuestFollowUpEvent(record as GuestFollowUpEventDatabaseRecord),
  );
}

/**
 * Narrow server append. The database repeats project, guest, and creator scope
 * before inserting and accepts only the allowlisted metadata projection.
 */
export async function appendGuestFollowUpEventForVerifiedProject(input: {
  channel: GuestFollowUpEvent['channel'];
  eventType: GuestFollowUpEvent['eventType'];
  guestId: string;
  messageKind: GuestFollowUpEvent['messageKind'];
  metadata: GuestFollowUpMetadata;
  occurredAt: string;
  project: OwnedProject;
}): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc('append_guest_follow_up_event_for_server', {
    requested_channel: input.channel,
    requested_event_type: input.eventType,
    requested_message_kind: input.messageKind,
    requested_metadata: {
      ...(input.metadata.noteCategory
        ? { note_category: input.metadata.noteCategory }
        : {}),
      ...(input.metadata.sourceSurface
        ? { source_surface: input.metadata.sourceSurface }
        : {}),
      ...(input.metadata.templateVersion
        ? { template_version: input.metadata.templateVersion }
        : {}),
    },
    requested_occurred_at: input.occurredAt,
    target_created_by: input.project.account_id,
    target_guest_id: input.guestId,
    target_project_id: input.project.id,
  });

  if (error || typeof data !== 'string') {
    throw new GuestFollowUpRepositoryError();
  }

  return data;
}
