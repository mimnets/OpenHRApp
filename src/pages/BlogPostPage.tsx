import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Calendar, User } from 'lucide-react';
import { blogService } from '../services/blog.service';
import { BlogPost } from '../types';

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
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center p-1.5">
                <img src="./img/logo.png" className="w-full h-full object-contain" alt="OpenHRApp" />
              </div>
              <span className="text-lg font-black tracking-tight">
                <span className="text-primary">Open</span>
                <span className="text-[#f59e0b]">HR</span>
                <span className="text-[#10b981]">App</span>
              </span>
            </div>
            <button
              onClick={goToBlog}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} /> Back to Blog
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="animate-spin mx-auto text-primary" size={48} />
          <p className="text-slate-500 mt-4">Loading post...</p>
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
        <article>
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

          {/* Article Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

            {/* Back to blog */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <button
                onClick={goToBlog}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
              >
                <ArrowLeft size={16} /> Back to all posts
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
};

export default BlogPostPage;
