from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    content = target.read_text()
    if old not in content:
        raise SystemExit(f"Missing fix anchor in {path}: {old!r}")
    target.write_text(content.replace(old, new, 1))


replace_once(
    "src/modules/media/invitation-audio.validation.ts",
    "return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;",
    "return bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;",
)

publication_test = "src/modules/publications/__tests__/publication.service.test.ts"
replace_once(
    publication_test,
    """const {
  getCurrentPublishedMock,
  getOwnedProjectMock,
  getPaymentOverviewMock,
  publishSnapshotMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  getCurrentPublishedMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  getPaymentOverviewMock: vi.fn(),
  publishSnapshotMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));""",
    """const {
  assertInvitationAudioReadyMock,
  getActiveInvitationDraftMock,
  getCurrentPublishedMock,
  getOwnedProjectMock,
  getPaymentOverviewMock,
  publishSnapshotMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  assertInvitationAudioReadyMock: vi.fn(),
  getActiveInvitationDraftMock: vi.fn(),
  getCurrentPublishedMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  getPaymentOverviewMock: vi.fn(),
  publishSnapshotMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));""",
)
replace_once(
    publication_test,
    "vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));\n",
    """vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/invitations/invitation-draft.repository', () => ({
  getActiveInvitationDraftForVerifiedProject: getActiveInvitationDraftMock,
}));
vi.mock('@/modules/media/invitation-audio.service', () => ({
  assertInvitationAudioReadyForVerifiedProject: assertInvitationAudioReadyMock,
}));
""",
)
replace_once(
    publication_test,
    "      draft: {\n        closing:",
    """      draft: {
        audio: {
          assetId: null,
          durationSeconds: null,
          originalFileName: null,
          rightsAcknowledged: false,
        },
        closing:""",
)
replace_once(
    publication_test,
    """    getOwnedProjectMock.mockReset().mockResolvedValue(project);
    getCurrentPublishedMock.mockReset().mockResolvedValue(null);""",
    """    getOwnedProjectMock.mockReset().mockResolvedValue(project);
    getActiveInvitationDraftMock.mockReset().mockResolvedValue({
      content: snapshot().snapshot.draft,
    });
    assertInvitationAudioReadyMock.mockReset().mockResolvedValue(undefined);
    getCurrentPublishedMock.mockReset().mockResolvedValue(null);""",
)
