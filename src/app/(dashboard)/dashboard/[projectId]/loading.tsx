export default function ProjectWorkspaceLoading() {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="border-seraya-border-default bg-seraya-surface/80 grid min-h-48 place-items-center rounded-[var(--seraya-radius-lg)] border p-8 text-center shadow-[var(--seraya-shadow-card)]"
      data-workspace-route-loading
      role="status"
    >
      <div>
        <span
          aria-hidden="true"
          className="border-seraya-action-primary/25 border-t-seraya-action-primary mx-auto block size-7 animate-spin rounded-full border-[3px]"
        />
        <p className="text-seraya-text-primary mt-4 text-sm font-semibold">Menyiapkan workspace…</p>
        <p className="text-seraya-text-muted mt-1 text-xs">Navigasi proyek tetap tersedia.</p>
      </div>
    </div>
  );
}
