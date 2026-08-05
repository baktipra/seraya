from pathlib import Path

preview = Path('src/components/projects/invitation-editor-live-preview.tsx')
preview_content = preview.read_text()
unused_import = "  type InvitationAudioChangedEventDetail,\n"
if unused_import not in preview_content:
    raise SystemExit('Unused preview audio event import was not found.')
preview.write_text(preview_content.replace(unused_import, '', 1))

editor = Path('src/components/projects/invitation-editor.tsx')
editor_content = editor.read_text()
effect = """  useEffect(() => {
    setPreviewAudio(draft.content.audio);
  }, [draft.content.audio]);

"""
if effect not in editor_content:
    raise SystemExit('Preview audio synchronization effect was not found.')
editor.write_text(editor_content.replace(effect, '', 1))
