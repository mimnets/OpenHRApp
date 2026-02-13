import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { blogService } from '../services/blog.service';
import { BlogPost } from '../types';
import { PublicAdBanner } from '../components/ads';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogSidebar from '../components/blog/BlogSidebar';
import BlogFooter from '../components/blog/BlogFooter';

const BlogPostSkeleton = () => (
  <div className="animate-pulse">
    <div className="w-full h-64 md:h-80 bg-slate-200 rounded-2xl" />
    <div className="py-8 space-y-6">
      <div className="h-9 bg-slate-100 rounded w-3/4" />
      <div className="h-8 bg-slate-50 rounded w-1/2" />
      <div className="flex items-center gap-4 pb-8 border-b border-slate-200">
        <div className="h-4 bg-slate-100 rounded w-28" />
        <div className="h-4 bg-slate-100 rounded w-36" />
      </div>
      <div className="h-16 bg-slate-50 rounded border-l-4 border-slate-200" />
      <div className="space-y-3 pt-4">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-50 rounded w-5/6" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-50 rounded w-4/6" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-50 rounded w-3/4" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-50 rounded w-2/3" />
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

  const loadPost = async () => {
    setIsLoading(true);
    setNotFound(false);
    const data = await blogService.getPostBySlug(slug);
    if (data) {
      setPost(data);
    } else {
      setNotFound(true);
    }
    setIsLoading(false);
  };

  const goToBlog = () => {
    window.location.hash = '/blog';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Post Not Found</h2>
            <p className="text-slate-500 mb-6">The blog post you're looking for doesn't exist or has been unpublished.</p>
            <button
              onClick={goToBlog}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all"
            >
              Back to Blog
            </button>
          </div>
        ) : post && (
          <>
            {/* Hero Cover Image */}
            {post.coverImage && (
              <div className="w-full h-64 md:h-96 bg-slate-200">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Ad - Blog Post Top */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex justify-center">
              <PublicAdBanner slot="blog-post-top" />
            </div>

            {/* Article with Sidebar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Article */}
                <article className="flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
                    {post.title}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-200">
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
                  </div>

                  {post.excerpt && (
                    <p className="text-lg text-slate-600 italic mb-8 border-l-4 border-primary pl-4">
                      {post.excerpt}
                    </p>
                  )}

                  <div
                    className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />

                  {/* Ad - Blog Post Content */}
                  <div className="mt-8 flex justify-center">
                    <PublicAdBanner slot="blog-post-content" />
                  </div>

                  {/* Back to blog */}
                  <div className="mt-12 pt-8 border-t border-slate-200">
                    <button
                      onClick={goToBlog}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
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
