import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import { blogService } from '../services/blog.service';
import { BlogPost } from '../types';
import { PublicAdBanner, AdFrame } from '../components/ads';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogSidebar from '../components/blog/BlogSidebar';
import BlogFooter from '../components/blog/BlogFooter';
import { updatePageMeta, setJsonLd } from '../utils/seo';
import { spaLinkProps, STRETCHED_LINK } from '../utils/spaLink';
import { getReadingTime } from '../utils/readingTime';

const BlogCardSkeleton = () => (
  <div className="bg-dl-surface rounded-dl-lg border border-dl-hair-soft shadow-dl-1 overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-dl-hair-soft" />
    <div className="p-6 space-y-3">
      <div className="h-5 bg-dl-hair-soft rounded w-5/6" />
      <div className="h-4 bg-dl-ground rounded w-full" />
      <div className="h-4 bg-dl-ground rounded w-3/4" />
      <div className="flex items-center gap-4 pt-2">
        <div className="h-3 bg-dl-ground rounded w-20" />
        <div className="h-3 bg-dl-ground rounded w-24" />
      </div>
    </div>
  </div>
);

interface BlogPageProps {
  onBack: () => void;
  onRegisterClick?: () => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ onBack, onRegisterClick }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArchive, setSelectedArchive] = useState<{ year: number; month: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    updatePageMeta(
      'Blog | OpenHRApp',
      'Latest news, updates, and insights about HR management, employee engagement, and OpenHRApp product updates.',
      'https://openhrapp.com/blog'
    );
    setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'OpenHRApp Blog',
          description: 'Latest news, updates, and insights about HR management, employee engagement, and OpenHRApp product updates.',
          url: 'https://openhrapp.com/blog',
          isPartOf: {
            '@type': 'WebSite',
            name: 'OpenHRApp',
            url: 'https://openhrapp.com',
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://openhrapp.com/' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://openhrapp.com/blog' },
          ],
        },
      ],
    });
    return () => { setJsonLd(null); };
  }, []);

  useEffect(() => {
    loadPosts();
  }, [page]);

  useEffect(() => {
    applyFilters();
  }, [posts, selectedArchive, selectedCategory]);

  const loadPosts = async () => {
    setIsLoading(true);
    const data = await blogService.getPublishedPosts(page, 10);
    setPosts(data.posts);
    setTotalPages(data.totalPages);
    setIsLoading(false);
    if (data.posts.length > 0) {
      setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: 'OpenHRApp Blog',
            description: 'Latest news, updates, and insights about HR management, employee engagement, and OpenHRApp product updates.',
            url: 'https://openhrapp.com/blog',
            isPartOf: { '@type': 'WebSite', name: 'OpenHRApp', url: 'https://openhrapp.com' },
          },
          {
            '@type': 'ItemList',
            name: 'OpenHRApp Blog Posts',
            url: 'https://openhrapp.com/blog',
            numberOfItems: data.posts.length,
            itemListElement: data.posts.map((post, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://openhrapp.com/blog/${post.slug}`,
              name: post.title,
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://openhrapp.com/' },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://openhrapp.com/blog' },
            ],
          },
        ],
      });
    }
  };

  const applyFilters = () => {
    let result = [...posts];

    if (selectedArchive && selectedArchive.year !== 0) {
      result = result.filter(post => {
        const date = new Date(post.publishedAt || post.created);
        return date.getFullYear() === selectedArchive.year && date.getMonth() === selectedArchive.month;
      });
    }

    if (selectedCategory) {
      result = result.filter(post => post.category === selectedCategory);
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

  const displayPosts = filteredPosts;

  return (
    <div className="min-h-screen bg-dl-ground flex flex-col">
      {/* Navbar */}
      <BlogNavbar onBack={onBack} onRegisterClick={onRegisterClick} />

      {/* Header */}
      <div className="bg-dl-surface border-b border-dl-hair-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-semibold text-dl-ink tracking-tight">Blog</h1>
          <p className="text-dl-muted mt-3 text-lg">Latest news, updates, and insights</p>
        </div>
      </div>

      {/* Ad - Blog Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex justify-center">
        <PublicAdBanner slot="blog-header" />
      </div>

      {/* Active Filter Banner */}
      {(selectedArchive || selectedCategory) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-dl-teal/5 border border-dl-teal/15 rounded-dl-md px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-dl-teal font-semibold">
              Filtering by:{' '}
              {selectedArchive && (
                <span className="inline-flex items-center gap-1 bg-dl-teal/10 px-2 py-0.5 rounded-full text-xs mr-2">
                  {new Date(selectedArchive.year, selectedArchive.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 bg-dl-teal/10 px-2 py-0.5 rounded-full text-xs">
                  {selectedCategory}
                </span>
              )}
            </p>
            <button
              onClick={() => { setSelectedArchive(null); setSelectedCategory(null); }}
              className="text-xs font-bold text-dl-teal hover:text-dl-teal-deep transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Content with Sidebar */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div data-advertising="eligible" className="flex flex-col lg:flex-row gap-8">
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
                  <p className="text-dl-muted text-lg">
                    {selectedArchive || selectedCategory
                      ? 'No posts found for this filter. Try a different selection.'
                      : 'No posts published yet. Check back soon!'}
                  </p>
                  {(selectedArchive || selectedCategory) && (
                    <button
                      onClick={() => { setSelectedArchive(null); setSelectedCategory(null); }}
                      className="mt-4 px-5 py-2.5 bg-dl-teal text-dl-surface rounded-dl-md font-bold text-sm hover:bg-dl-teal-deep transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {displayPosts.map((post, i) => (
                      <React.Fragment key={post.id}>
                      <article
                        className="relative bg-dl-surface rounded-dl-lg border border-dl-hair-soft shadow-dl-1 overflow-hidden cursor-pointer hover:shadow-dl-1 hover:-translate-y-1 transition-all duration-200 focus-within:shadow-dl-1"
                      >
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-dl-teal/10 to-dl-teal/5 flex items-center justify-center">
                            <span className="text-4xl font-semibold text-dl-teal/20">{post.title.charAt(0)}</span>
                          </div>
                        )}
                        <div className="p-6">
                          <h2 className="text-lg font-bold text-dl-ink mb-2 line-clamp-2">
                            <a {...spaLinkProps(`/blog/${post.slug}`)} className={STRETCHED_LINK}>
                              {post.title}
                            </a>
                          </h2>
                          {post.excerpt && (
                            <p className="text-dl-muted text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-dl-muted">
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
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {post.readingTime ? `${post.readingTime} min read` : getReadingTime(post.content)}
                            </span>
                          </div>
                        </div>
                      </article>
                      {/* An ad row after every 4th post, spanning both columns; not after the last post. */}
                      {(i + 1) % 4 === 0 && i < displayPosts.length - 1 && (
                        <div className="md:col-span-2"><AdFrame placement="blog" /></div>
                      )}
                      </React.Fragment>
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
                        className="px-5 py-2.5 bg-dl-surface border border-dl-hair rounded-dl-md font-bold text-sm text-dl-muted hover:bg-dl-ground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-dl-muted">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-5 py-2.5 bg-dl-surface border border-dl-hair rounded-dl-md font-bold text-sm text-dl-muted hover:bg-dl-ground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      <AdFrame placement="blog" className="px-4 py-6" />

      {/* Footer */}
      <BlogFooter />
    </div>
  );
};

export default BlogPage;
