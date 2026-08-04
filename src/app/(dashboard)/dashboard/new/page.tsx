import { ProjectSetupForm } from '@/components/projects/project-setup-form';
import { ProjectTemplatePreselectionBridge } from '@/components/projects/project-template-preselection-bridge';
import { WorkspacePage } from '@/components/workspace/workspace-page';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <WorkspacePage align="center" kind="onboarding" width="standard">
      <ProjectTemplatePreselectionBridge />
      <ProjectSetupForm />
    </WorkspacePage>
  );
}
