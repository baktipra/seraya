import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconFrame({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 13.5 12 5l8 8.5" />
      <path d="M6.5 11.5V20h11v-8.5" />
      <path d="M10 20v-5h4v5" />
    </IconFrame>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V20h11v-9.5" />
      <path d="M10 20v-5h4v5" />
    </IconFrame>
  );
}

export function InvitationIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <rect height="15" rx="2" width="12" x="6" y="4" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </IconFrame>
  );
}

export function GuestsIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a2.5 2.5 0 0 1 0 5M18 20a4.5 4.5 0 0 0-2.5-4" />
    </IconFrame>
  );
}

export function ResponseIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 5.5h16v11H9l-5 3.5Z" />
      <path d="m8.5 11 2.2 2.2 4.8-5" />
    </IconFrame>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </IconFrame>
  );
}

export function FollowUpIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 18h14" />
      <path d="M7 15.5V10a5 5 0 0 1 10 0v5.5" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
      <path d="M17.5 6.5 20 4" />
    </IconFrame>
  );
}

export function BillingIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M3 10h18M7 15h3" />
    </IconFrame>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.35 2.35-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.5h-3.32v-.08A1.7 1.7 0 0 0 10.17 18.9a1.7 1.7 0 0 0-1.88.34l-.06.06-2.35-2.35.06-.06A1.7 1.7 0 0 0 6.28 15a1.7 1.7 0 0 0-1.56-1.03H4.5v-3.32h.08A1.7 1.7 0 0 0 6.1 9.62a1.7 1.7 0 0 0-.34-1.88L5.7 7.68l2.35-2.35.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.02 4.2V4.1h3.32v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.35 2.35-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3.32h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </IconFrame>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9a2.35 2.35 0 1 1 3.95 1.72c-.95.88-1.75 1.35-1.75 2.78" />
      <path d="M12 16.9h.01" />
    </IconFrame>
  );
}
