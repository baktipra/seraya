from pathlib import Path

path = Path('tests/integration/supabase-foundation.test.ts')
content = path.read_text()

old_bucket = """        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        file_size_limit: '10485760',"""
new_bucket = """        allowed_mime_types: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'audio/mpeg',
          'audio/mp4',
          'audio/x-m4a',
        ],
        file_size_limit: '15728640',"""
if old_bucket not in content:
    raise SystemExit('Legacy invitation-media bucket expectation was not found.')
content = content.replace(old_bucket, new_bucket, 1)

marker = "  it('finalizes ready gallery media atomically, enforces cap/duplicate safeguards, and freezes ready identity', async () => {\n"
audio_test = r'''  it('finalizes, replaces, validates, and removes private invitation audio atomically', async () => {
    const firstAudio = 'c8111111-1111-4111-8111-111111111111';
    const replacementAudio = 'c8222222-2222-4222-8222-222222222222';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.media_assets (
        id,
        project_id,
        storage_path,
        media_kind,
        mime_type,
        size_bytes,
        original_file_name,
        rights_acknowledged_at
      ) values
        (
          '${firstAudio}',
          '${projectA}',
          'projects/${projectA}/audio/${firstAudio}.mp3',
          'invitation_audio',
          'audio/mpeg',
          128,
          'lagu-pertama.mp3',
          now()
        ),
        (
          '${replacementAudio}',
          '${projectA}',
          'projects/${projectA}/audio/${replacementAudio}.m4a',
          'invitation_audio',
          'audio/mp4',
          256,
          'lagu-pengganti.m4a',
          now()
        );
    `);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        select public.finalize_invitation_audio_media_asset(
          '${projectA}', '${firstAudio}', 'audio/mpeg', 128, 120
        );
      `),
    ).rejects.toThrow(/permission denied/i);

    await resetToDatabaseOwner(database);
    await database.query(`
      select public.finalize_invitation_audio_media_asset(
        '${projectA}', '${firstAudio}', 'audio/mpeg', 128, 120
      );
    `);

    const firstFinalized = await database.query<{
      audio: {
        assetId: string;
        durationSeconds: number;
        originalFileName: string;
        rightsAcknowledged: boolean;
      };
      duration_seconds: number;
      status: string;
    }>(`
      select
        asset.status,
        asset.duration_seconds,
        draft.content -> 'audio' as audio
      from public.media_assets as asset
      join public.invitation_drafts as draft on draft.project_id = asset.project_id
      where asset.id = '${firstAudio}';
    `);
    expect(firstFinalized.rows[0]).toMatchObject({
      audio: {
        assetId: firstAudio,
        durationSeconds: 120,
        originalFileName: 'lagu-pertama.mp3',
        rightsAcknowledged: true,
      },
      duration_seconds: 120,
      status: 'ready',
    });

    await expect(
      database.query(`
        update public.media_assets
        set duration_seconds = 121
        where id = '${firstAudio}';
      `),
    ).rejects.toThrow(/immutable/i);

    await database.query(`
      select public.finalize_invitation_audio_media_asset(
        '${projectA}', '${replacementAudio}', 'audio/mp4', 256, 180
      );
    `);

    const afterReplacement = await database.query<{
      audio_asset_id: string;
      first_status: string;
      replacement_status: string;
    }>(`
      select
        draft.content #>> '{audio,assetId}' as audio_asset_id,
        first.status::text as first_status,
        replacement.status::text as replacement_status
      from public.invitation_drafts as draft
      join public.media_assets as first on first.id = '${firstAudio}'
      join public.media_assets as replacement on replacement.id = '${replacementAudio}'
      where draft.project_id = '${projectA}';
    `);
    expect(afterReplacement.rows).toEqual([
      {
        audio_asset_id: replacementAudio,
        first_status: 'deleted',
        replacement_status: 'ready',
      },
    ]);

    await database.query(`
      select public.validate_invitation_draft_gallery_media(
        '${projectA}',
        (select content from public.invitation_drafts where project_id = '${projectA}')
      );
    `);

    await database.query(`
      select public.remove_invitation_audio_media_asset('${projectA}', '${replacementAudio}');
    `);

    const afterRemoval = await database.query<{
      asset_id: string | null;
      status: string;
    }>(`
      select
        draft.content #>> '{audio,assetId}' as asset_id,
        asset.status::text as status
      from public.invitation_drafts as draft
      join public.media_assets as asset on asset.id = '${replacementAudio}'
      where draft.project_id = '${projectA}';
    `);
    expect(afterRemoval.rows).toEqual([{ asset_id: null, status: 'deleted' }]);

    await expect(
      database.query(`
        insert into public.media_assets (
          project_id,
          storage_path,
          media_kind,
          mime_type,
          size_bytes,
          original_file_name
        ) values (
          '${projectA}',
          'projects/${projectA}/audio/no-rights.mp3',
          'invitation_audio',
          'audio/mpeg',
          32,
          'no-rights.mp3'
        );
      `),
    ).rejects.toThrow(/media_assets_audio_rights_valid/i);
  });

'''
if marker not in content:
    raise SystemExit('Gallery media test insertion marker was not found.')
content = content.replace(marker, audio_test + marker, 1)
path.write_text(content)
