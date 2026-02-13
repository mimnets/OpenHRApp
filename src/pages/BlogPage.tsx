import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Calendar, User } from 'lucide-react';
import { blogService } from '../services/blog.service';
import { BlogPost } from '../types';
import { PublicAdBanner } from '../components/ads';

interface BlogPageProps {
  onBack: () => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ onBack }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPosts();
  }, [page]);

  const loadPosts = async () => {
    setIsLoading(true);
    const data = await blogService.getPublishedPosts(page, 9);
    setPosts(data.posts);
    setTotalPages(data.totalPages);
    setIsLoading(false);
  };

  const navigateToPost = (slug: string) => {
    window.location.hash = `/blog/${slug}`;
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
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
          </div>
        </div>
      </nav>

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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin mx-auto text-primary" size={48} />
            <p className="text-slate-500 mt-4">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No posts published yet. Check back soon!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
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
            {totalPages > 1 && (
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
    </div>
  );
};

export default BlogPage;
