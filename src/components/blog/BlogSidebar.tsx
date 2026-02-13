import React, { useState, useEffect } from 'react';
import { Archive, Tag, Calendar, ChevronRight } from 'lucide-react';
import { blogService } from '../../services/blog.service';
import { BlogPost } from '../../types';

interface ArchiveEntry {
  label: string;
  year: number;
  month: number;
  count: number;
}

interface BlogSidebarProps {
  onArchiveSelect?: (year: number, month: number) => void;
  onCategorySelect?: (category: string) => void;
  selectedArchive?: { year: number; month: number } | null;
  selectedCategory?: string | null;
}

const BLOG_CATEGORIES = [
  'HR Tips',
  'Product Updates',
  'Company Culture',
  'Compliance',
  'Remote Work',
  'Employee Engagement',
];

const BlogSidebar: React.FC<BlogSidebarProps> = ({
  onArchiveSelect,
  onCategorySelect,
  selectedArchive,
  selectedCategory,
}) => {
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    setIsLoading(true);
    const data = await blogService.getPublishedPosts(1, 50);
    const posts = data.posts;

    // Build archive from posts
    const archiveMap = new Map<string, ArchiveEntry>();
    posts.forEach(post => {
      const date = new Date(post.publishedAt || post.created);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      if (archiveMap.has(key)) {
        archiveMap.get(key)!.count++;
      } else {
        archiveMap.set(key, {
          label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          year,
          month,
          count: 1,
        });
      }
    });

    const sortedArchives = Array.from(archiveMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    setArchives(sortedArchives);
    setRecentPosts(posts.slice(0, 5));
    setIsLoading(false);
  };

  const navigateToPost = (slug: string) => {
    window.location.hash = `/blog/${slug}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
          <div className="h-5 bg-slate-100 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-50 rounded w-full" />
            <div className="h-4 bg-slate-50 rounded w-4/5" />
            <div className="h-4 bg-slate-50 rounded w-3/4" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
          <div className="h-5 bg-slate-100 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-50 rounded w-full" />
            <div className="h-4 bg-slate-50 rounded w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BookmarkIcon /> Recent Posts
          </h3>
          <ul className="space-y-3">
            {recentPosts.map(post => (
              <li key={post.id}>
                <button
                  onClick={() => navigateToPost(post.slug)}
                  className="group w-full text-left"
                >
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(post.publishedAt || post.created).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Blog Archive */}
      {archives.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Archive size={14} className="text-primary" /> Archive
          </h3>
          <ul className="space-y-1">
            {archives.map(entry => {
              const isActive =
                selectedArchive?.year === entry.year &&
                selectedArchive?.month === entry.month;
              return (
                <li key={`${entry.year}-${entry.month}`}>
                  <button
                    onClick={() => onArchiveSelect?.(entry.year, entry.month)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-primary font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronRight size={12} className={isActive ? 'text-primary' : 'text-slate-300'} />
                      {entry.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {entry.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selectedArchive && (
            <button
              onClick={() => onArchiveSelect?.(0, 0)}
              className="mt-3 w-full text-xs text-center text-primary hover:text-primary-hover font-semibold transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Tag size={14} className="text-primary" /> Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {BLOG_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategorySelect?.(isActive ? '' : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {selectedCategory && (
          <button
            onClick={() => onCategorySelect?.('')}
            className="mt-3 w-full text-xs text-center text-primary hover:text-primary-hover font-semibold transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
};

// Small icon component for Recent Posts header
const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

export default BlogSidebar;
