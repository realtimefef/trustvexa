'use client';

import * as React from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type FaqEntry = { category: string; q: string; a: string };

function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function FaqExplorer({ items }: { items: ReadonlyArray<FaqEntry> }) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string>('All');
  const [open, setOpen] = React.useState<string | null>(null);

  const categories = React.useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchesCat = category === 'All' || i.category === category;
      const matchesQuery =
        q === '' || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [items, query, category]);

  // Group filtered results by category.
  const grouped = React.useMemo(() => {
    const map = new Map<string, FaqEntry[]>();
    for (const item of filtered) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions and answers…"
          className="h-14 pl-12 pr-12 text-base"
          aria-label="Search FAQ"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count =
            cat === 'All' ? items.length : items.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                category === cat
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                  : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {cat}
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs',
                  category === cat ? 'bg-white/20' : 'bg-muted',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grouped results */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="font-medium">No matching questions</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([cat, entries]) => (
            <div key={cat}>
              <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-semibold">
                <span className="h-5 w-1.5 rounded-full bg-brand-gradient" aria-hidden="true" />
                {cat}
                <span className="text-sm font-normal text-muted-foreground">
                  ({entries.length})
                </span>
              </h2>
              <div className="divide-y divide-border rounded-2xl border bg-card/60 backdrop-blur">
                {entries.map((item) => {
                  const key = `${cat}-${item.q}`;
                  const isOpen = open === key;
                  return (
                    <div key={key}>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : key)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                      >
                        <span className="font-medium">{highlight(item.q, query)}</span>
                        <ChevronDown
                          className={cn(
                            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
                            isOpen && 'rotate-180 text-primary',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      <div
                        className={cn(
                          'grid overflow-hidden transition-all duration-300 ease-out',
                          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                        )}
                      >
                        <div className="overflow-hidden">
                          <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                            {highlight(item.a, query)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
