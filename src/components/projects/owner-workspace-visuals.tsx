import type { SVGProps } from 'react';

import type { InvitationWorkspaceTask } from './invitation-task-workspace.types';

type VisualProps = SVGProps<SVGSVGElement>;

function TaskIconFrame({ children, ...props }: VisualProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 32 32"
      {...props}
    >
      {children}
    </svg>
  );
}

export function InvitationTaskGlyph({
  task,
  ...props
}: VisualProps & { task: InvitationWorkspaceTask }) {
  switch (task) {
    case 'couple':
      return (
        <TaskIconFrame {...props}>
          <circle cx="11" cy="11" r="4" />
          <circle cx="22" cy="11" r="4" />
          <path d="M4.5 26c.7-5.1 3-7.5 6.5-7.5s5.8 2.4 6.5 7.5" />
          <path d="M15.5 26c.7-5.1 3-7.5 6.5-7.5s5.8 2.4 6.5 7.5" />
        </TaskIconFrame>
      );
    case 'opening':
      return (
        <TaskIconFrame {...props}>
          <rect height="19" rx="3" width="24" x="4" y="7" />
          <path d="m5.5 10 10.5 8 10.5-8" />
          <path d="M11 6V4M16 6V3M21 6V4" />
        </TaskIconFrame>
      );
    case 'schedule':
      return (
        <TaskIconFrame {...props}>
          <rect height="22" rx="3" width="24" x="4" y="6" />
          <path d="M9 3v6M23 3v6M4 12h24" />
          <path d="M10 17h4v4h-4zM18 17h4v4h-4z" />
        </TaskIconFrame>
      );
    case 'story':
      return (
        <TaskIconFrame {...props}>
          <path d="M6 6.5h8a4 4 0 0 1 4 4V27H10a4 4 0 0 1-4-4Z" />
          <path d="M26 6.5h-4a4 4 0 0 0-4 4V27h4a4 4 0 0 0 4-4Z" />
          <path d="M10 12h4M10 17h4M22 12h-1" />
        </TaskIconFrame>
      );
    case 'media':
      return (
        <TaskIconFrame {...props}>
          <rect height="19" rx="3" width="22" x="3" y="5" />
          <circle cx="10" cy="11" r="2.5" />
          <path d="m5.5 21 5.5-5 4 3 4-5 4 4" />
          <path d="M27 12v12M27 14.5l3-1.5M27 24a3 3 0 1 1-3-3" />
        </TaskIconFrame>
      );
    case 'gift':
      return (
        <TaskIconFrame {...props}>
          <rect height="17" rx="2" width="24" x="4" y="12" />
          <path d="M16 12v17M4 17h24" />
          <path d="M16 12c-5 0-7.5-1.5-7.5-4 0-1.8 1.3-3 3.2-3 2.8 0 4.3 3.1 4.3 7Z" />
          <path d="M16 12c5 0 7.5-1.5 7.5-4 0-1.8-1.3-3-3.2-3-2.8 0-4.3 3.1-4.3 7Z" />
        </TaskIconFrame>
      );
    case 'rsvp':
      return (
        <TaskIconFrame {...props}>
          <circle cx="16" cy="16" r="12" />
          <path d="m10 16 4 4 8-9" />
        </TaskIconFrame>
      );
    case 'closing':
      return (
        <TaskIconFrame {...props}>
          <path d="M7 24c5-1 9-4.8 12-11l6-6 2 2-6 6c-6.2 3-10 7-11 12Z" />
          <path d="m19 13 2 2M7 24l-2 3 3-1" />
        </TaskIconFrame>
      );
    case 'design':
      return (
        <TaskIconFrame {...props}>
          <path d="M16 4a12 12 0 1 0 0 24h2.5a2.5 2.5 0 0 0 0-5H17a2 2 0 0 1 0-4h3a8 8 0 0 0 0-16Z" />
          <circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="21" cy="9" r="1" fill="currentColor" stroke="none" />
        </TaskIconFrame>
      );
    case 'preview':
      return (
        <TaskIconFrame {...props}>
          <path d="M3 16s4.5-8 13-8 13 8 13 8-4.5 8-13 8S3 16 3 16Z" />
          <circle cx="16" cy="16" r="4" />
        </TaskIconFrame>
      );
    case 'publish':
      return (
        <TaskIconFrame {...props}>
          <path d="M16 24V5" />
          <path d="m9 12 7-7 7 7" />
          <path d="M6 20v7h20v-7" />
        </TaskIconFrame>
      );
  }
}

export function GuestRosterVisual(props: VisualProps) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 320 188" {...props}>
      <rect
        fill="var(--seraya-bg-surface)"
        height="164"
        rx="22"
        stroke="var(--seraya-border-subtle)"
        width="286"
        x="17"
        y="12"
      />
      <rect fill="var(--seraya-bg-brand-soft)" height="14" rx="7" width="96" x="38" y="32" />
      {[0, 1, 2].map((row) => (
        <g key={row} transform={`translate(38 ${64 + row * 34})`}>
          <circle
            cx="12"
            cy="12"
            fill={
              row === 1
                ? 'color-mix(in srgb, var(--seraya-sage) 18%, var(--seraya-bg-surface))'
                : 'var(--seraya-bg-brand-soft)'
            }
            r="12"
          />
          <circle
            cx="12"
            cy="9"
            fill="none"
            r="3.2"
            stroke="var(--seraya-text-secondary)"
            strokeWidth="1.6"
          />
          <path
            d="M6.8 17.2c.8-3 2.5-4.5 5.2-4.5s4.4 1.5 5.2 4.5"
            stroke="var(--seraya-text-secondary)"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
          <rect fill="var(--seraya-bg-surface-subtle)" height="8" rx="4" width={92 - row * 8} x="36" y="4" />
          <rect fill="var(--seraya-bg-surface-subtle)" height="6" rx="3" width={58 + row * 7} x="36" y="17" />
          <rect
            fill={row === 2 ? 'var(--seraya-bg-brand-soft)' : 'var(--seraya-status-success-soft)'}
            height="20"
            rx="10"
            width="68"
            x="172"
            y="2"
          />
          {row < 2 ? (
            <path
              d="m190 12 5 5 9-10"
              stroke="var(--seraya-status-success)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          ) : (
            <path
              d="M192 12h10"
              stroke="var(--seraya-action-primary)"
              strokeLinecap="round"
              strokeWidth="2"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

export function ResponseFlowVisual(props: VisualProps) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 320 188" {...props}>
      <rect
        fill="var(--seraya-bg-surface)"
        height="164"
        rx="22"
        stroke="var(--seraya-border-subtle)"
        width="286"
        x="17"
        y="12"
      />
      <g transform="translate(38 34)">
        <rect fill="var(--seraya-bg-brand-soft)" height="84" rx="18" width="108" />
        <circle
          cx="54"
          cy="42"
          fill="var(--seraya-bg-surface)"
          r="27"
          stroke="var(--seraya-action-primary)"
          strokeWidth="8"
        />
        <path
          d="M54 15a27 27 0 0 1 24 39"
          stroke="var(--seraya-status-success)"
          strokeLinecap="round"
          strokeWidth="8"
        />
        <path
          d="m44 42 7 7 14-17"
          stroke="var(--seraya-text-primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </g>
      <g transform="translate(165 38)">
        <rect fill="var(--seraya-bg-surface-subtle)" height="10" rx="5" width="106" />
        <rect fill="var(--seraya-bg-surface-subtle)" height="8" rx="4" width="74" y="20" />
        {[0, 1, 2].map((bar) => (
          <g key={bar} transform={`translate(0 ${48 + bar * 27})`}>
            <rect fill="var(--seraya-bg-surface-subtle)" height="8" rx="4" width="108" />
            <rect
              fill={bar === 0 ? 'var(--seraya-status-success)' : 'var(--seraya-action-primary)'}
              height="8"
              rx="4"
              width={88 - bar * 19}
            />
          </g>
        ))}
      </g>
      <path
        d="M66 145h64l13 12v-12h31a12 12 0 0 0 12-12v-5H66Z"
        fill="color-mix(in srgb, var(--seraya-sage) 18%, var(--seraya-bg-surface))"
      />
      <path
        d="M84 136h72"
        stroke="var(--seraya-text-secondary)"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}
