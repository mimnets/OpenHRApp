import React, { useState, useEffect } from 'react';
import { Calendar, User } from 'lucide-react';
import { blogService } from '../services/blog.service';
import { BlogPost } from '../types';
import { PublicAdBanner } from '../components/ads';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogSidebar from '../components/blog/BlogSidebar';
import BlogFooter from '../components/blog/BlogFooter';

const BlogCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-slate-100" />
    <div className="p-6 space-y-3">
      <div className="h-5 bg-slate-100 rounded w-5/6" />
      <div className="h-4 bg-slate-50 rounded w-full" />
      <div className="h-4 bg-slate-50 rounded w-3/4" />
      <div className="flex items-center gap-4 pt-2">
        <div className="h-3 bg-slate-50 rounded w-20" />
        <div className="h-3 bg-slate-50 rounded w-24" />
      </div>
    </div>
  </div>
);

interface BlogPageProps {
  onBack: () => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ onBack }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArchive, setSelectedArchive] = useState<{ year: number; month: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [page]);

  useEffect(() => {
    applyFilters();
  }, [posts, selectedArchive, selectedCategory]);

  const loadPosts = async () => {
    setIsLoading(true);
    const data = await blogService.getPublishedPosts(page, 20);
    setPosts(data.posts);
    setTotalPages(data.totalPages);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let result = [...posts];

    if (selectedArchive && selectedArchive.year !== 0) {
      result = result.filter(post => {
        const date = new Date(post.publishedAt || post.created);
        return date.getFullYear() === selectedArchive.year && date.getMonth() === selectedArchive.month;
      });
    }

    setFilteredPosts(result);
  };

  const handleArchiveSelect = (year: number, month: number) => {
    if (year === 0 && month === 0) {
      setSelectedArchive(null);
    } else {
      setSelectedArchive({ year, month });
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category || null);
  };

  const navigateToPost = (slug: string) => {
    window.location.hash = `/blog/${slug}`;
  };

  const displayPosts = filteredPosts;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <BlogNavbar onBack={onBack} />

      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Blog</h1>
          <p className="text-slate-500 mt-3 text-lg">Latest news, updates, and insights</p>
        </div>
      </div>

      {/* Ad - Blog Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex justify-center">
        <PublicAdBanner slot="blog-header" />
      </div>

      {/* Active Filter Banner */}
      {(selectedArchive || selectedCategory) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-primary font-semibold">
              Filtering by:{' '}
              {selectedArchive && (
                <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-xs mr-2">
                  {new Date(selectedArchive.year, selectedArchive.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                  {selectedCategory}
                </span>
              )}
            </p>
            <button
              onClick={() => { setSelectedArchive(null); setSelectedCategory(null); }}
              className="text-xs font-bold text-primary hover:text-primary-hover transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Content with Sidebar */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <BlogCardSkeleton />
                  <BlogCardSkeleton />
                  <BlogCardSkeleton />
                  <div className="hidden md:block"><BlogCardSkeleton /></div>
                </div>
              ) : displayPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-slate-500 text-lg">
                    {selectedArchive || selectedCategory
                      ? 'No posts found for this filter. Try a different selection.'
                      : 'No posts published yet. Check back soon!'}
                  </p>
                  {(selectedArchive || selectedCategory) && (
                    <button
                      onClick={() => { setSelectedArchive(null); setSelectedCategory(null); }}
                      className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {displayPosts.map(post => (
                      <article
                        key={post.id}
                        onClick={() => navigateToPost(post.slug)}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                      >
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <span className="text-4xl font-black text-primary/20">{post.title.charAt(0)}</span>
                          </div>
                        )}
                        <div className="p-6">
                          <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{post.title}</h2>
                          {post.excerpt && (
                            <p className="text-slate-500 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            {post.authorName && (
                              <span className="flex items-center gap-1">
                                <User size={12} /> {post.authorName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {post.publishedAt
                                ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : new Date(post.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Ad - Blog Feed */}
                  <div className="mt-10 flex justify-center">
                    <PublicAdBanner slot="blog-feed" />
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && !selectedArchive && !selectedCategory && (
                    <div className="flex items-center justify-center gap-3 mt-12">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-500">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <BlogSidebar
                  onArchiveSelect={handleArchiveSelect}
                  onCategorySelect={handleCategorySelect}
                  selectedArchive={selectedArchive}
                  selectedCategory={selectedCategory}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <BlogFooter />
    </div>
  );
};

export default BlogPage;
