import { useState } from 'react';
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

export function Avatar({
  name,
  color,
  size = 'md',
  src,
}: {
  name: string;
  color?: string | null;
  size?: 'sm' | 'md';
  /** Optional profile photo. Fixed box + cover + error fallback, so a
   *  missing/broken image degrades to the deterministic glyph. */
  src?: string | null;
}) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  const Glyph = GLYPHS[hashName(name) % GLYPHS.length];
  const [broken, setBroken] = useState(false);
  const showPhoto = !!src && !broken;
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl text-white shadow-lg ${dims}`}
      style={{ background: `linear-gradient(135deg, ${color ?? '#6366f1'}, ${color ?? '#6366f1'}cc)` }}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <Glyph size={size === 'sm' ? 15 : 20} strokeWidth={2.2} />
      )}
    </div>
  );
}
