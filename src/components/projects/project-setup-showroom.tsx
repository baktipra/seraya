'use client';

import dynamic from 'next/dynamic';

const ProjectSetupFormPreview = dynamic(
  () => import('./project-setup-form').then((module) => module.ProjectSetupForm),
  {
    loading: () => (
      <div
        aria-live="polite"
        className="border-seraya-border-default bg-seraya-surface grid min-h-[32rem] place-items-center border px-6 text-center"
        role="status"
      >
        <div>
          <span
            aria-hidden="true"
            className="border-seraya-action-primary/25 border-t-seraya-action-primary mx-auto block size-9 animate-spin rounded-full border-2"
          />
          <p className="text-seraya-text-secondary mt-4 text-sm">Menyiapkan guided project creation…</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

/** Preview-only client island. The production owner route still uses the SSR form and server action. */
export function ProjectSetupShowroom() {
  return <ProjectSetupFormPreview previewMode />;
}
