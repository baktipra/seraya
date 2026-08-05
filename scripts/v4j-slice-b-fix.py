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

replace_once(
    "src/modules/publications/__tests__/publication.service.test.ts",
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
