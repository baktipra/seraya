import type { ReactNode } from 'react';

export type WorkspaceWidth = 'reading' | 'standard' | 'operations' | 'studio';

const widthClassNames: Record<WorkspaceWidth, string> = {
  reading: 'max-w-none lg:max-w-[58rem]',
  standard: 'max-w-none lg:max-w-[64rem]',
  operations: 'max-w-none lg:max-w-[74rem]',
  studio: 'max-w-none',
};

export interface WorkspacePageProps {
  align?: 'center' | 'start';
  children: ReactNode;
  className?: string;
  width: WorkspaceWidth;
}

/**
 * Canonical owner-workspace canvas. Project routes align to the content slot's
 * left edge; standalone onboarding surfaces may opt into centered alignment.
 */
export function WorkspacePage({
  align = 'start',
  children,
  className,
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
      data-workspace-page
      data-workspace-width={width}
    >
      {children}
    </div>
  );
}
