import type { ReactNode } from 'react';

import styles from './invitation-studio-shell.module.css';

/**
 * Structural owner for the invitation workspace. The editor, section rail,
 * preview, and command surfaces remain in their real JSX positions; this shell
 * only supplies the shared studio layout authority.
 */
export function InvitationStudioShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.studio} data-invitation-studio>
      {children}
    </div>
  );
}
