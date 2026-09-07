import { Search, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { t } = useLanguage();
  return (
    <div className="surface flex items-center gap-1 rounded-xl px-3 py-1 focus-within:border-slate-400 dark:focus-within:border-slate-500">
      <Search size={16} className="shrink-0 text-slate-400" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('');
        }}
        placeholder={placeholder}
        aria-label={t.search.label}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="min-h-[42px] w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.search.clear}
          className="btn-press -my-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
