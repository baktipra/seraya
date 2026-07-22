import type { ReactNode } from 'react';

export type WorkspaceWidth = 'reading' | 'standard' | 'operations' | 'studio';
export type WorkspaceAnatomy = 'onboarding' | 'compass' | 'operations' | 'studio';
export type WorkspaceKind =
  | 'onboarding'
  | 'compass'
  | 'guests'
  | 'delivery'
  | 'responses'
  | 'follow-up'
  | 'studio';

const widthClassNames: Record<WorkspaceWidth, string> = {
  reading: 'max-w-none lg:max-w-[58rem]',
  standard: 'max-w-none lg:max-w-[64rem]',
  operations: 'max-w-none lg:max-w-[74rem]',
  studio: 'max-w-none',
};

const anatomyByKind: Record<WorkspaceKind, WorkspaceAnatomy> = {
  onboarding: 'onboarding',
  compass: 'compass',
  guests: 'operations',
  delivery: 'operations',
  responses: 'operations',
  'follow-up': 'operations',
  studio: 'studio',
};

export interface WorkspacePageProps {
  align?: 'center' | 'start';
  children: ReactNode;
  className?: string;
  kind: WorkspaceKind;
  width: WorkspaceWidth;
}

/**
 * Canonical owner-workspace canvas. Width, horizontal origin, page anatomy,
 * and vertical rhythm are selected explicitly by the route.
 */
export function WorkspacePage({
  align = 'start',
  children,
  className,
  kind,
  width,
}: WorkspacePageProps) {
  return (
    <div
      className={[
        'w-full min-w-0',
        widthClassNames[width],
        align === 'center' ? 'mx-auto' : 'mr-auto',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-workspace-align={align}
      data-workspace-anatomy={anatomyByKind[kind]}
      data-workspace-kind={kind}
      data-workspace-page
      data-workspace-width={width}
    >
      {children}
    </div>
  );
}
