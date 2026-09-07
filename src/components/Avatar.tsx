import { initials } from '../lib/format';

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string | null; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm';
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl font-extrabold text-white shadow-lg ${dims}`}
      style={{ background: `linear-gradient(135deg, ${color ?? '#6366f1'}, ${color ?? '#6366f1'}cc)` }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
