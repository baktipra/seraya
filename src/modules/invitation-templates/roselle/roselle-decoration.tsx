import type { SVGProps } from 'react';

import styles from './roselle.module.css';

export function RosellePetalDecoration({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={[styles.petalDecoration, className].filter(Boolean).join(' ')}
      fill="none"
      focusable="false"
      viewBox="0 0 180 126"
      {...props}
    >
      <path d="M20 106c20-31 48-47 85-50" stroke="currentColor" strokeLinecap="round" />
      <path d="M52 83c-13-17-10-35 6-45 14 15 12 33-6 45Z" fill="currentColor" opacity=".16" />
      <path d="M89 64c-3-21 7-35 27-38 3 20-7 34-27 38Z" fill="currentColor" opacity=".22" />
      <path d="M112 55c10-16 26-21 42-13-11 15-27 20-42 13Z" fill="currentColor" opacity=".14" />
      <circle cx="39" cy="91" fill="currentColor" r="4" opacity=".55" />
      <circle cx="97" cy="59" fill="currentColor" r="3" opacity=".5" />
      <path d="M130 30c5-8 12-12 20-12-3 9-10 14-20 12Z" fill="currentColor" opacity=".42" />
    </svg>
  );
}

export function RoselleDivider() {
  return (
    <div aria-hidden="true" className={styles.divider}>
      <span />
      <i />
      <span />
    </div>
  );
}
