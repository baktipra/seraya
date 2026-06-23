import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';
import { formatProjectEventDate, getProjectStatusLabel } from '@/modules/projects/project.mapper';
import type { ProjectLauncherItem } from '@/modules/projects/project.repository';

export function DashboardProjectLauncher({ projects }: { projects: ProjectLauncherItem[] }) {
  return (
    <section aria-labelledby="project-launcher-title" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Ruang undangan
          </p>
          <h1
            className="seraya-display-md mt-3 text-[clamp(2rem,4vw,3rem)]"
            id="project-launcher-title"
          >
            Undangan kalian
          </h1>
          <p className="text-seraya-text-secondary mt-3 text-base leading-7">
            Pilih undangan yang ingin kalian lanjutkan.
          </p>
        </div>
        <form action="/dashboard/new" method="get">
          <Button type="submit">Buat undangan baru</Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} aria-label={`Project ${project.coupleLabel}`}>
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-2xl">{project.coupleLabel}</CardTitle>
                <Badge variant="brand">{getProjectStatusLabel(project.status)}</Badge>
              </div>
              <CardDescription>
                {formatProjectEventDate(project.event_date_primary)} · {project.event_city}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form action={`/dashboard/${project.id}`} method="get">
                <Button type="submit" variant="secondary">
                  Buka project
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
