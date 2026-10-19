/** The Zaster receipt mark: a receipt with a torn edge carrying a bold Z. */
export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="var(--z-ember)" />
      <path
        d="M17 12h30a3 3 0 0 1 3 3v35l-3.75 3.5-3.75-3.5-3.75 3.5-3.75-3.5-3.75 3.5-3.75-3.5-3.75 3.5-3.75-3.5-3.75 3.5L14 50V15a3 3 0 0 1 3-3z"
        fill="var(--z-paper)"
      />
      <path
        d="M23 23h18L23 39h18"
        fill="none"
        stroke="var(--z-ink)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
