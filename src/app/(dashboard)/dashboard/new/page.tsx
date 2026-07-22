import { ProjectSetupForm } from '@/components/projects/project-setup-form';
import { WorkspacePage } from '@/components/workspace/workspace-page';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <WorkspacePage align="center" kind="onboarding" width="standard">
      <ProjectSetupForm />
    </WorkspacePage>
  );
}
