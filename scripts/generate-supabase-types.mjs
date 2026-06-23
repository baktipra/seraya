import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const outputPath = path.join(repositoryRoot, 'src', 'server', 'supabase', 'database.types.ts');
const temporaryOutputPath = `${outputPath}.tmp`;
const projectRefIndex = process.argv.indexOf('--project-ref');
const projectRef = projectRefIndex >= 0 ? process.argv[projectRefIndex + 1]?.trim() : undefined;

if (projectRefIndex >= 0 && !projectRef) {
  console.error('Missing a project ref after --project-ref.');
  process.exit(1);
}

const cliArguments = ['supabase', 'gen', 'types', 'typescript'];

if (projectRef) {
  cliArguments.push('--project-id', projectRef);
} else {
  cliArguments.push('--local');
}

cliArguments.push('--schema', 'public');

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', cliArguments, {
  cwd: repositoryRoot,
  encoding: 'utf8',
});

if (result.error) {
  console.error(`Could not start Supabase CLI: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || 'Supabase CLI type generation failed.\n');
  console.error(
    projectRef
      ? 'Remote type generation requires an authorized Supabase CLI session or SUPABASE_ACCESS_TOKEN.'
      : 'Local type generation requires a running local Supabase instance. Run `npm run supabase:start` and `npm run db:reset` first.',
  );
  process.exit(result.status ?? 1);
}

if (!result.stdout.trim()) {
  console.error(
    'Supabase CLI returned no type output; existing generated types were left unchanged.',
  );
  process.exit(1);
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(temporaryOutputPath, result.stdout, 'utf8');
renameSync(temporaryOutputPath, outputPath);
rmSync(temporaryOutputPath, { force: true });

console.log(
  `Generated ${path.relative(repositoryRoot, outputPath)} from ${projectRef ? `project ${projectRef}` : 'local Supabase'}.`,
);
