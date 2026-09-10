import { Circle, Diamond, Hexagon, Sparkles, Square, Star, Triangle, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const GLYPHS: LucideIcon[] = [
  Hexagon,
  Triangle,
  Circle,
  Square,
  Diamond,
  Star,
  Sparkles,
  Zap,
];

/** djb2 hash — stable identity per canonical name, no randomness. */
function hashName(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string | null; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  const Glyph = GLYPHS[hashName(name) % GLYPHS.length];
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl text-white shadow-lg ${dims}`}
      style={{ background: `linear-gradient(135deg, ${color ?? '#6366f1'}, ${color ?? '#6366f1'}cc)` }}
      aria-hidden
    >
      <Glyph size={size === 'sm' ? 15 : 20} strokeWidth={2.2} />
    </div>
  );
}
