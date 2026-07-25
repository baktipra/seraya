import { Badge } from '@/design-system';
import { formatProjectEventDate, getProjectStatusLabel } from '@/modules/projects/project.mapper';
import type { ProjectLauncherItem } from '@/modules/projects/project.repository';

export function DashboardProjectLauncher({ projects }: { projects: ProjectLauncherItem[] }) {
  return (
    <section aria-labelledby="project-launcher-title">
      <h2 className="sr-only" id="project-launcher-title">
        Undangan kalian
      </h2>

      <div className="grid gap-4">
        {projects.map((project) => (
          <article
            aria-label={`Project ${project.coupleLabel}`}
            className="border-seraya-border-default bg-seraya-surface group relative grid min-w-0 overflow-hidden border transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-seraya-border-strong hover:shadow-[0_20px_50px_rgb(59_42_36_/_0.07)] md:grid-cols-[minmax(0,1fr)_12rem]"
            key={project.id}
          >
            <span
              aria-hidden="true"
              className="bg-seraya-action-primary absolute inset-y-0 left-0 w-0.5 origin-bottom scale-y-0 transition-transform group-hover:scale-y-100"
            />

            <div className="min-w-0 px-5 py-6 sm:px-7 sm:py-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
                    Undangan pernikahan
                  </p>
                  <h3 className="text-seraya-text-primary mt-3 truncate font-serif text-[clamp(2rem,4vw,2.8rem)] leading-none font-medium tracking-[-0.035em]">
                    {project.coupleLabel}
                  </h3>
                  <p className="text-seraya-text-secondary mt-4 text-sm leading-6">
                    {formatProjectEventDate(project.event_date_primary)} · {project.event_city}
                  </p>
                </div>
                <Badge className="shrink-0 self-start" variant="brand">
                  {getProjectStatusLabel(project.status)}
                </Badge>
              </div>
            </div>

            <div className="border-seraya-border-default flex items-center border-t px-5 py-4 md:border-t-0 md:border-l md:px-6">
              <form action={`/dashboard/${project.id}`} className="w-full" method="get">
                <button
                  className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--seraya-radius-sm)] text-sm font-semibold transition-[color,transform] focus-visible:outline-3 focus-visible:outline-offset-2"
                  type="submit"
                >
                  Buka undangan
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
