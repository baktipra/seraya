import type { ReactNode } from 'react';

import styles from './invitation-studio-shell.module.css';

export function InvitationStudioShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.studio} data-invitation-studio>
      {children}
    </div>
  );
}
