import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Layers, FileText, BookOpen, HelpCircle } from 'lucide-react';
import { useSearch } from '../../context/SearchContext';
import { navigateTo } from '../../utils/seo';
import { blogService } from '../../services/blog.service';
import { tutorialService } from '../../services/tutorial.service';
import { features } from '../../data/features';
import { faqs } from '../../data/faqs';

interface SearchItem {
  type: 'feature' | 'blog' | 'guide' | 'faq';
  title: string;
  description: string;
  url: string;
  category?: string;
}

const TYPE_ORDER: SearchItem['type'][] = ['feature', 'blog', 'guide', 'faq'];
const TYPE_LABELS: Record<SearchItem['type'], string> = {
  feature: 'Features',
  blog: 'Blog Posts',
  guide: 'Guides',
  faq: 'FAQ',
};
const TYPE_ICONS: Record<SearchItem['type'], React.FC<{ size?: number; className?: string }>> = {
  feature: Layers,
  blog: FileText,
  guide: BookOpen,
  faq: HelpCircle,
};

const MAX_PER_CATEGORY = 5;

function buildStaticItems(): SearchItem[] {
  const items: SearchItem[] = [];

  // Features
  for (const f of features) {
    items.push({
      type: 'feature',
      title: f.title,
      description: f.description,
      url: `/features/${f.slug}`,
    });
  }

  // FAQs
  for (const group of faqs) {
    for (const item of group.items) {
      items.push({
        type: 'faq',
        title: item.q,
        description: item.a,
        url: '/#faq',
        category: group.category,
      });
    }
  }

  return items;
}

const STATIC_ITEMS = buildStaticItems();

const SearchDialog: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useSearch();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allItems, setAllItems] = useState<SearchItem[]>(STATIC_ITEMS);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const dataLoaded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Lazy-load blog + tutorial data on first open
  useEffect(() => {
    if (!isSearchOpen || dataLoaded.current) return;
    dataLoaded.current = true;

    const loadData = async () => {
      const dynamicItems: SearchItem[] = [...STATIC_ITEMS];
      try {
        const { posts } = await blogService.getPublishedPosts(1, 100);
        for (const p of posts) {
          dynamicItems.push({
            type: 'blog',
            title: p.title,
            description: p.excerpt || '',
            url: `/blog/${p.slug}`,
          });
        }
      } catch { /* PocketBase may be unavailable */ }
      try {
        const { tutorials } = await tutorialService.getPublishedTutorials(1, 100);
        for (const t of tutorials) {
          dynamicItems.push({
            type: 'guide',
            title: t.title,
            description: t.excerpt || '',
            url: `/how-to-use/${t.slug}`,
            category: t.category,
          });
        }
      } catch { /* PocketBase may be unavailable */ }
      setAllItems(dynamicItems);
    };

    loadData();
  }, [isSearchOpen]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(0);
  }, [debouncedQuery]);

  // Focus input on open
  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setDebouncedQuery('');
      setHighlightIndex(0);
      // Small delay for DOM to render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSearchOpen]);

  // Filter results
  const filteredByType = useCallback((): Record<SearchItem['type'], SearchItem[]> => {
    const result: Record<SearchItem['type'], SearchItem[]> = {
      feature: [],
      blog: [],
      guide: [],
      faq: [],
    };
    if (!debouncedQuery.trim()) return result;
    const q = debouncedQuery.toLowerCase();
    for (const item of allItems) {
      if (result[item.type].length >= MAX_PER_CATEGORY) continue;
      if (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      ) {
        result[item.type].push(item);
      }
    }
    return result;
  }, [debouncedQuery, allItems]);

  const grouped = filteredByType();
  const flatResults: SearchItem[] = [];
  for (const type of TYPE_ORDER) {
    flatResults.push(...grouped[type]);
  }
  const hasResults = flatResults.length > 0;
  const hasQuery = debouncedQuery.trim().length > 0;

  const navigateToResult = useCallback((item: SearchItem) => {
    setSearchOpen(false);
    if (item.url === '/#faq') {
      // Navigate to landing page then scroll to FAQ
      const currentPath = window.location.pathname;
      if (currentPath === '/') {
        document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigateTo('/');
        setTimeout(() => {
          document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } else {
      navigateTo(item.url);
    }
  }, [setSearchOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[highlightIndex]) {
      e.preventDefault();
      navigateToResult(flatResults[highlightIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchOpen(false);
    }
  }, [flatResults, highlightIndex, navigateToResult, setSearchOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const el = resultsRef.current.querySelector(`[data-index="${highlightIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  if (!isSearchOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex justify-center pt-[10vh] md:pt-[20vh] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[70vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search size={20} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features, blog posts, guides, FAQ..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
          {/* Esc badge (desktop) / X button (mobile) */}
          <button
            onClick={() => setSearchOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
          <kbd className="hidden md:inline-flex items-center px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-600">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto">
          {hasQuery && !hasResults && (
            <div className="px-4 py-12 text-center">
              <Search size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No results found for "{debouncedQuery}"</p>
            </div>
          )}

          {!hasQuery && (
            <div className="px-4 py-12 text-center">
              <Search size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Start typing to search...</p>
            </div>
          )}

          {hasResults && TYPE_ORDER.map(type => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const Icon = TYPE_ICONS[type];
            return (
              <div key={type} className="py-2">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Icon size={14} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {TYPE_LABELS[type]}
                  </span>
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isHighlighted = idx === highlightIndex;
                  return (
                    <button
                      key={`${item.type}-${item.url}-${idx}`}
                      data-index={idx}
                      onClick={() => navigateToResult(item)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors min-h-[44px] ${
                        isHighlighted
                          ? 'bg-primary/10 dark:bg-primary/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isHighlighted
                            ? 'text-primary'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      {item.category && (
                        <span className="flex-shrink-0 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-0.5">
                          {item.category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint bar */}
        <div className="hidden md:flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-600">&uarr;&darr;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-600">&crarr;</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-600">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchDialog;
