import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ChevronRight, Clock, User } from 'lucide-react';
import { blogService } from '../services/blog.service';
import { BlogPost } from '../types';
import { PublicAdBanner } from '../components/ads';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogSidebar from '../components/blog/BlogSidebar';
import BlogFooter from '../components/blog/BlogFooter';
import { sanitizeHtml } from '../utils/sanitize';
import { getReadingTime } from '../utils/readingTime';
import { navigateTo, updatePageMeta, setJsonLd } from '../utils/seo';
import { spaLinkProps } from '../utils/spaLink';

const BlogPostSkeleton = () => (
  <div className="animate-pulse">
    <div className="w-full h-64 md:h-80 bg-dl-hair rounded-dl-lg" />
    <div className="py-8 space-y-6">
      <div className="h-9 bg-dl-hair-soft rounded w-3/4" />
      <div className="h-8 bg-dl-ground rounded w-1/2" />
      <div className="flex items-center gap-4 pb-8 border-b border-dl-hair">
        <div className="h-4 bg-dl-hair-soft rounded w-28" />
        <div className="h-4 bg-dl-hair-soft rounded w-36" />
      </div>
      <div className="h-16 bg-dl-ground rounded border-l-4 border-dl-hair" />
      <div className="space-y-3 pt-4">
        <div className="h-4 bg-dl-hair-soft rounded w-full" />
        <div className="h-4 bg-dl-hair-soft rounded w-full" />
        <div className="h-4 bg-dl-ground rounded w-5/6" />
        <div className="h-4 bg-dl-hair-soft rounded w-full" />
        <div className="h-4 bg-dl-ground rounded w-4/6" />
        <div className="h-4 bg-dl-hair-soft rounded w-full" />
        <div className="h-4 bg-dl-ground rounded w-3/4" />
        <div className="h-4 bg-dl-hair-soft rounded w-full" />
        <div className="h-4 bg-dl-ground rounded w-2/3" />
      </div>
    </div>
  </div>
);

interface BlogPostPageProps {
  slug: string;
  onBack: () => void;
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug, onBack }) => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadPost();
  }, [slug]);

  useEffect(() => {
    return () => {
      // Clean up JSON-LD when leaving the page
      setJsonLd(null);
    };
  }, []);

  const loadPost = async () => {
    setIsLoading(true);
    setNotFound(false);
    const data = await blogService.getPostBySlug(slug);
    if (data) {
      setPost(data);
      updatePageMeta(
        `${data.title} | OpenHRApp Blog`,
        data.excerpt || `Read ${data.title} on the OpenHRApp Blog.`,
        `https://openhrapp.com/blog/${slug}`,
        data.coverImage || undefined
      );
      setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: data.title,
            description: data.excerpt || '',
            image: data.coverImage || 'https://openhrapp.com/img/screenshot-wide.png',
            datePublished: data.publishedAt || data.created,
            dateModified: data.updated || data.publishedAt || data.created,
            author: {
              '@type': 'Person',
              name: data.authorName || 'OpenHRApp Team',
            },
            publisher: {
              '@type': 'Organization',
              name: 'OpenHRApp',
              logo: {
                '@type': 'ImageObject',
                url: 'https://openhrapp.com/img/logo.webp',
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://openhrapp.com/blog/${slug}`,
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://openhrapp.com/' },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://openhrapp.com/blog' },
              { '@type': 'ListItem', position: 3, name: data.title, item: `https://openhrapp.com/blog/${slug}` },
            ],
          },
        ],
      });
    } else {
      setNotFound(true);
    }
    setIsLoading(false);
  };

  const goToBlog = () => {
    navigateTo('/blog');
  };

  return (
    <div className="min-h-screen bg-dl-ground flex flex-col">
      {/* Navbar */}
      <BlogNavbar onBack={onBack} />

      {/* Content */}
      <div className="flex-1">
        {isLoading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 min-w-0">
                <BlogPostSkeleton />
              </div>
              <div className="lg:w-80 flex-shrink-0" />
            </div>
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-dl-ink mb-2">Post Not Found</h2>
            <p className="text-dl-muted mb-6">The blog post you're looking for doesn't exist or has been unpublished.</p>
            <button
              onClick={goToBlog}
              className="px-6 py-3 bg-dl-teal text-dl-surface rounded-dl-md font-bold hover:bg-dl-teal-deep transition-all"
            >
              Back to Blog
            </button>
          </div>
        ) : post && (
          <>
            {/* Hero Cover Image */}
            {post.coverImage && (
              <div className="w-full h-64 md:h-96 bg-dl-hair">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Ad - Blog Post Top */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex justify-center">
              <PublicAdBanner slot="blog-post-top" contentLength={post.content?.length ?? 0} />
            </div>

            {/* Article with Sidebar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Article */}
                <article className="flex-1 min-w-0 overflow-x-hidden" data-advertising="eligible">
                  {/* Mirrors the BreadcrumbList JSON-LD emitted above exactly.
                      Structured data must describe what the page actually shows,
                      and the category is deliberately omitted from both: blog
                      category filtering is component state with no stable URL,
                      so a category crumb would have nothing to link to. */}
                  <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-dl-muted flex-wrap mb-4">
                    <a {...spaLinkProps('/')} className="hover:text-dl-teal transition-colors font-medium">
                      Home
                    </a>
                    <ChevronRight size={14} aria-hidden="true" />
                    <a {...spaLinkProps('/blog')} className="hover:text-dl-teal transition-colors font-medium">
                      Blog
                    </a>
                    <ChevronRight size={14} aria-hidden="true" />
                    <span className="text-dl-ink line-clamp-1" aria-current="page">{post.title}</span>
                  </nav>

                  <h1 className="text-3xl md:text-4xl font-semibold text-dl-ink tracking-tight mb-4">
                    {post.title}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-dl-muted mb-8 pb-8 border-b border-dl-hair">
                    {post.authorName && (
                      <span className="flex items-center gap-1.5">
                        <User size={16} /> {post.authorName}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar size={16} />
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : new Date(post.created).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} /> {post.readingTime ? `${post.readingTime} min read` : getReadingTime(post.content)}
                    </span>
                  </div>

                  {post.updated && post.publishedAt && (() => {
                    const pubDate = new Date(post.publishedAt).getTime();
                    const updDate = new Date(post.updated).getTime();
                    const dayMs = 24 * 60 * 60 * 1000;
                    if (updDate - pubDate > dayMs) {
                      return (
                        <p className="text-xs text-dl-muted mb-6 -mt-6">
                          Updated on {new Date(post.updated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      );
                    }
                    return null;
                  })()}

                  {post.excerpt && (
                    <p className="text-lg text-dl-muted italic mb-8 border-l-4 border-dl-teal pl-4">
                      {post.excerpt}
                    </p>
                  )}

                  <div
                    className="prose prose-slate prose-lg max-w-none dark:prose-invert prose-headings:font-dl-display prose-headings:font-semibold prose-headings:tracking-dl-head prose-a:text-dl-teal prose-a:underline prose-img:rounded-dl-md"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                  />

                  {/* Ad - Blog Post Content (only for substantial posts 2000+ words) */}
                  {(() => {
                    const wordCount = post.content ? post.content.split(/\s+/).filter(Boolean).length : 0;
                    if (wordCount >= 2000) {
                      return (
                        <div className="mt-8 flex justify-center">
                          <PublicAdBanner slot="blog-post-content" contentLength={post.content?.length ?? 0} />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Back to blog */}
                  <div className="mt-12 pt-8 border-t border-dl-hair">
                    <button
                      onClick={goToBlog}
                      className="flex items-center gap-2 text-sm font-semibold text-dl-muted hover:text-dl-teal transition-colors"
                    >
                      <ArrowLeft size={16} /> Back to all posts
                    </button>
                  </div>
                </article>

                {/* Right Sidebar */}
                <div className="lg:w-80 flex-shrink-0">
                  <div className="lg:sticky lg:top-24">
                    <BlogSidebar />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <BlogFooter />
    </div>
  );
};

export default BlogPostPage;
