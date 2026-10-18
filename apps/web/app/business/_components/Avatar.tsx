/** Initials on ember, like the apps' Avatar. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-sm bg-brand text-footnote font-bold text-on-brand"
    >
      {initials}
    </span>
  );
}
