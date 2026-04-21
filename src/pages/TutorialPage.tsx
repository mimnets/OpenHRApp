import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { tutorialService } from '../services/tutorial.service';
import { Tutorial } from '../types';
import TutorialsNavbar from '../components/tutorials/TutorialsNavbar';
import TutorialsFooter from '../components/tutorials/TutorialsFooter';
import { sanitizeHtml } from '../utils/sanitize';
import { navigateTo, updatePageMeta, setJsonLd } from '../utils/seo';

interface TutorialPageProps {
  slug: string;
  onBack: () => void;
}

const TutorialPage: React.FC<TutorialPageProps> = ({ slug, onBack }) => {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadData();
  }, [slug]);

  useEffect(() => {
    return () => {
      setJsonLd(null);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setNotFound(false);

    const [tutorialData, allData] = await Promise.all([
      tutorialService.getTutorialBySlug(slug),
      tutorialService.getPublishedTutorials(1, 100),
    ]);

    if (tutorialData) {
      setTutorial(tutorialData);
      setAllTutorials(allData.tutorials);
      updatePageMeta(
        `${tutorialData.title} | OpenHR Guides`,
        tutorialData.excerpt || `Learn how to ${tutorialData.title.toLowerCase()} with OpenHR.`,
        `https://openhrapp.com/how-to-use/${slug}`,
        tutorialData.coverImage || undefined
      );
      // Build breadcrumb items
      const breadcrumbItems: any[] = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://openhrapp.com/' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://openhrapp.com/how-to-use' },
      ];
      let pos = 3;
      if (tutorialData.category) {
        breadcrumbItems.push({ '@type': 'ListItem', position: pos++, name: tutorialData.category });
      }
      const parent = tutorialData.parentId
        ? allData.tutorials.find(t => t.id === tutorialData.parentId)
        : null;
      if (parent) {
        breadcrumbItems.push({ '@type': 'ListItem', position: pos++, name: parent.title, item: `https://openhrapp.com/how-to-use/${parent.slug}` });
      }
      breadcrumbItems.push({ '@type': 'ListItem', position: pos, name: tutorialData.title, item: `https://openhrapp.com/how-to-use/${slug}` });

      setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: tutorialData.title,
            description: tutorialData.excerpt || '',
            image: tutorialData.coverImage || 'https://openhrapp.com/img/screenshot-wide.png',
            datePublished: tutorialData.created,
            dateModified: tutorialData.updated || tutorialData.created,
            author: {
              '@type': 'Person',
              name: tutorialData.authorName || 'OpenHR Team',
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
              '@id': `https://openhrapp.com/how-to-use/${slug}`,
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems,
          },
        ],
      });
    } else {
      setNotFound(true);
    }
    setIsLoading(false);
  };

  const goToTutorials = () => {
    navigateTo('/how-to-use');
  };

  const navigateToTutorial = (tutorialSlug: string) => {
    navigateTo(`/how-to-use/${tutorialSlug}`);
  };

  // Build navigation context
  const topLevel = allTutorials.filter(t => !t.parentId).sort((a, b) => a.displayOrder - b.displayOrder);
  const getChildren = (parentId: string) =>
    allTutorials.filter(c => c.parentId === parentId).sort((a, b) => a.displayOrder - b.displayOrder);

  // Find parent if this is a child
  const parentTutorial = tutorial?.parentId
    ? allTutorials.find(t => t.id === tutorial.parentId)
    : null;

  // Get flat list sorted for prev/next
  const flatList = topLevel.reduce<Tutorial[]>((acc, parent) => {
    acc.push(parent);
    acc.push(...getChildren(parent.id));
    return acc;
  }, []);

  const currentIndex = flatList.findIndex(t => t.id === tutorial?.id);
  const prevTutorial = currentIndex > 0 ? flatList[currentIndex - 1] : null;
  const nextTutorial = currentIndex < flatList.length - 1 ? flatList[currentIndex + 1] : null;

  // Get unique categories for sidebar
  const categories = Array.from(new Set(topLevel.map(t => t.category || 'General')));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TutorialsNavbar onBack={onBack} />

      <div className="flex-1">
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={40} />
            <p className="text-slate-500">Loading tutorial...</p>
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tutorial Not Found</h2>
            <p className="text-slate-500 mb-6">The tutorial you're looking for doesn't exist or has been unpublished.</p>
            <button
              onClick={goToTutorials}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all"
            >
              Back to Tutorials
            </button>
          </div>
        ) : tutorial && (
          <>
            {/* Breadcrumb */}
            <div className="bg-white border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <nav className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                  <button onClick={goToTutorials} className="hover:text-primary transition-colors font-medium">
                    Guides
                  </button>
                  {tutorial.category && (
                    <>
                      <ChevronRight size={14} />
                      <span>{tutorial.category}</span>
                    </>
                  )}
                  {parentTutorial && (
                    <>
                      <ChevronRight size={14} />
                      <button
                        onClick={() => navigateToTutorial(parentTutorial.slug)}
                        className="hover:text-primary transition-colors font-medium"
                      >
                        {parentTutorial.title}
                      </button>
                    </>
                  )}
                  <ChevronRight size={14} />
                  <span className="text-slate-900 font-semibold truncate">{tutorial.title}</span>
                </nav>
              </div>
            </div>

            {/* Cover Image */}
            {tutorial.coverImage && (
              <div className="w-full h-64 md:h-80 bg-slate-200">
                <img
                  src={tutorial.coverImage}
                  alt={tutorial.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Article with Sidebar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Article */}
                <article className="flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
                    {tutorial.title}
                  </h1>

                  {tutorial.authorName && (
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-200">
                      <span>By {tutorial.authorName}</span>
                    </div>
                  )}

                  {tutorial.excerpt && (
                    <p className="text-lg text-slate-600 italic mb-8 border-l-4 border-primary pl-4">
                      {tutorial.excerpt}
                    </p>
                  )}

                  <div
                    className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-primary prose-a:underline prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(tutorial.content) }}
                  />

                  {/* Previous / Next Navigation */}
                  {(prevTutorial || nextTutorial) && (
                    <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {prevTutorial ? (
                        <button
                          onClick={() => navigateToTutorial(prevTutorial.slug)}
                          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-sm transition-all text-left"
                        >
                          <ArrowLeft size={16} className="text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400 font-medium">Previous</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{prevTutorial.title}</p>
                          </div>
                        </button>
                      ) : <div />}
                      {nextTutorial && (
                        <button
                          onClick={() => navigateToTutorial(nextTutorial.slug)}
                          className="flex items-center justify-end gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-sm transition-all text-right"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400 font-medium">Next</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{nextTutorial.title}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Back to Tutorials */}
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <button
                      onClick={goToTutorials}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
                    >
                      <ArrowLeft size={16} /> Back to Guides
                    </button>
                  </div>
                </article>

                {/* Right Sidebar - Tutorial Tree Navigation */}
                <div className="lg:w-72 flex-shrink-0">
                  <div className="lg:sticky lg:top-24">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Tutorials</h4>
                      <nav className="space-y-1">
                        {categories.map(cat => {
                          const catTutorials = topLevel.filter(t => (t.category || 'General') === cat);
                          return (
                            <div key={cat} className="mb-4">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{cat}</p>
                              {catTutorials.map(t => {
                                const tChildren = getChildren(t.id);
                                const isActive = t.id === tutorial.id;
                                return (
                                  <div key={t.id}>
                                    <button
                                      onClick={() => navigateToTutorial(t.slug)}
                                      className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                        isActive
                                          ? 'bg-primary/10 text-primary font-bold'
                                          : 'text-slate-600 hover:text-primary hover:bg-primary/5 font-medium'
                                      }`}
                                    >
                                      {t.title}
                                    </button>
                                    {tChildren.length > 0 && (
                                      <div className="ml-3 border-l border-slate-200 pl-3 mt-1 mb-2 space-y-1">
                                        {tChildren.map(child => {
                                          const isChildActive = child.id === tutorial.id;
                                          return (
                                            <button
                                              key={child.id}
                                              onClick={() => navigateToTutorial(child.slug)}
                                              className={`block w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${
                                                isChildActive
                                                  ? 'bg-primary/10 text-primary font-bold'
                                                  : 'text-slate-500 hover:text-primary hover:bg-primary/5 font-medium'
                                              }`}
                                            >
                                              {child.title}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <TutorialsFooter />
    </div>
  );
};

export default TutorialPage;
