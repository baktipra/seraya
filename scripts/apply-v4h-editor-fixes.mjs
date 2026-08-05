import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/components/projects/event-utility-editor-fields.tsx';
let source = await readFile(path, 'utf8');

const patches = [
  {
    name: 'remove circular field error import',
    before: `
import { FieldError } from './invitation-editor-fields';
`,
    after: `
`,
  },
  {
    name: 'add local field error renderer',
    before: `function errorFor(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}
`,
    after: `function errorFor(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}

function UtilityFieldError({ message, name }: { message?: string; name: string }) {
  if (!message) return null;

  return (
    <p className="text-seraya-status-error text-sm leading-6" id={\`${'${fieldId(name)}'}-error\`} role="alert">
      {message}
    </p>
  );
}
`,
  },
  {
    name: 'use local field error renderer',
    before: '<FieldError',
    after: '<UtilityFieldError',
    replaceAll: true,
  },
  {
    name: 'stable manual map center',
    before: `          center: pinDraft,`,
    after: `          center: {
            lat: event.latitude ?? defaultMapCenter.lat,
            lng: event.longitude ?? defaultMapCenter.lng,
          },`,
  },
  {
    name: 'avoid map recreation on every idle update',
    before: `  }, [event.latitude, mapOpen, pinDraft]);`,
    after: `  }, [event.latitude, event.longitude, mapOpen]);`,
  },
];

for (const patch of patches) {
  if (source.includes(patch.after)) continue;
  if (!source.includes(patch.before)) {
    throw new Error(`V4H fix anchor unavailable: ${patch.name}`);
  }
  source = patch.replaceAll
    ? source.replaceAll(patch.before, patch.after)
    : source.replace(patch.before, patch.after);
}

await writeFile(path, source, 'utf8');
