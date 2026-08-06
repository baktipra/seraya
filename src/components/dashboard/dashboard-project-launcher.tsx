import { Badge } from '@/design-system';
import { formatProjectEventDate, getProjectStatusLabel } from '@/modules/projects/project.mapper';
import type { ProjectLauncherItem } from '@/modules/projects/project.repository';

import { InvitationIcon } from './dashboard-icons';

export function DashboardProjectLauncher({ projects }: { projects: ProjectLauncherItem[] }) {
  return (
    <section aria-labelledby="project-launcher-title">
      <h2 className="sr-only" id="project-launcher-title">
        Undangan kalian
      </h2>

      <div className="border-seraya-border-subtle divide-seraya-border-subtle divide-y border-y">
        {projects.map((project) => (
          <article
            aria-label={`Project ${project.coupleLabel}`}
            className="group grid min-w-0 items-center gap-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5 sm:py-5"
            key={project.id}
          >
            <span
              aria-hidden="true"
              className="bg-seraya-brand-softer text-seraya-action-primary grid size-12 place-items-center rounded-[var(--seraya-radius-md)] sm:size-14"
            >
              <InvitationIcon className="size-5 sm:size-6" strokeWidth={1.7} />
            </span>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <h3 className="text-seraya-text-primary min-w-0 truncate text-lg font-semibold tracking-[-0.025em] sm:text-xl">
                  {project.coupleLabel}
                </h3>
                <Badge className="shrink-0" variant="brand">
                  {getProjectStatusLabel(project.status)}
                </Badge>
              </div>
              <p className="text-seraya-text-secondary mt-1.5 text-sm leading-6">
                {formatProjectEventDate(project.event_date_primary)} · {project.event_city}
              </p>
            </div>

            <form action={`/dashboard/${project.id}`} className="w-full sm:w-auto" method="get">
              <button
                className="text-seraya-action-primary hover:bg-seraya-brand-softer focus-visible:outline-seraya-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--seraya-radius-md)] px-4 text-sm font-semibold transition-[background-color,color] focus-visible:outline-3 focus-visible:outline-offset-2 sm:w-auto"
                type="submit"
              >
                Buka
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
