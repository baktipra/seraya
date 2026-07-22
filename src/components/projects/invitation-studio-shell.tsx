import type { ReactNode } from 'react';

import styles from './invitation-studio-shell.module.css';

export function InvitationStudioShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.studio} data-invitation-studio>
      {children}

      <style>{`
        /*
         * Canonical laptop mode. The desktop phone preview and the three-column
         * studio must switch at the same breakpoint; otherwise a narrowed
         * browser window can show the phone while the editor still uses the
         * two-column/action-card layout.
         */
        @media (min-width: 1024px) and (max-width: 1535px) {
          [data-invitation-studio]
            section[aria-labelledby='invitation-editor-title']
            > :last-child
            > div:first-child {
            display: grid !important;
            grid-template-columns: 10rem minmax(0, 1fr) !important;
            grid-template-rows: auto !important;
            align-items: start !important;
            height: auto !important;
            min-height: calc(100svh - 8.5rem) !important;
            overflow: visible !important;
          }

          [data-invitation-studio] [data-invitation-editor-desktop-navigation] {
            position: sticky !important;
            top: 5rem !important;
            grid-column: 1 !important;
            grid-row: 1 !important;
            max-height: calc(100svh - 8.5rem) !important;
            align-self: start !important;
          }

          [data-invitation-studio] form:has([data-invitation-editor-panel]) {
            display: block !important;
            grid-column: 2 !important;
            grid-row: 1 !important;
            min-width: 0 !important;
            padding: 1.5rem 1.5rem 0 !important;
          }

          [data-invitation-studio] [data-invitation-editor-panel] {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
          }

          [data-invitation-studio]
            aside[data-local-preview-desktop]:not([data-local-preview-overlay]) {
            display: none !important;
          }

          [data-invitation-studio] button[data-local-preview-trigger] {
            display: inline-flex !important;
            width: auto !important;
            min-width: 8.5rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status']) {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 30 !important;
            width: 100% !important;
            margin: 1.25rem 0 0 !important;
            border-width: 1px 0 0 !important;
            border-radius: 0 !important;
            padding: 0.55rem 0.65rem !important;
            background: color-mix(in srgb, var(--seraya-surface) 98%, transparent) !important;
            box-shadow: 0 -8px 24px rgb(62 42 34 / 0.06) !important;
            backdrop-filter: blur(16px);
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div {
            display: grid !important;
            grid-template-columns: minmax(8rem, 1fr) auto !important;
            align-items: center !important;
            gap: 0.75rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:first-child {
            display: block !important;
            min-width: 0 !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:first-child
            p:first-child {
            margin: 0 !important;
            font-size: 0.72rem !important;
            line-height: 0.95rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:first-child
            p:last-child {
            margin: 0.1rem 0 0 !important;
            overflow: hidden !important;
            font-size: 0.62rem !important;
            line-height: 0.85rem !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:last-child {
            display: flex !important;
            width: auto !important;
            min-width: 0 !important;
            flex-flow: row nowrap !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 0.4rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:last-child
            > div:first-child {
            display: flex !important;
            width: auto !important;
            min-width: 0 !important;
            flex-flow: row nowrap !important;
            align-items: center !important;
            gap: 0.4rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            a[href$='/preview'] {
            display: none !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            button[data-editor-contextual-save-action],
          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            button[data-local-preview-trigger] {
            width: auto !important;
            min-width: 8.25rem !important;
            min-height: 2.4rem !important;
            padding-inline: 0.7rem !important;
            font-size: 0.75rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:last-child
            > p {
            display: none !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            [data-editor-publication-authority] {
            display: block !important;
            width: auto !important;
            margin: 0 !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            [data-editor-publication-authority]
            > div {
            display: flex !important;
            width: auto !important;
            flex-flow: row nowrap !important;
            align-items: center !important;
            gap: 0.4rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            [data-editor-publication-authority]
            button {
            width: auto !important;
            min-width: 9rem !important;
            min-height: 2.4rem !important;
            padding-inline: 0.7rem !important;
            font-size: 0.75rem !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            [data-editor-publication-authority]
            p,
          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            [data-editor-publication-authority]
            a {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
