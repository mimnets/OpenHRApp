import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { tutorialService } from '../services/tutorial.service';
import { Tutorial } from '../types';
import TutorialsNavbar from '../components/tutorials/TutorialsNavbar';
import TutorialsFooter from '../components/tutorials/TutorialsFooter';

interface TutorialsPageProps {
  onBack: () => void;
}

const TutorialsPage: React.FC<TutorialsPageProps> = ({ onBack }) => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTutorials();
  }, []);

  const loadTutorials = async () => {
    setIsLoading(true);
    const data = await tutorialService.getPublishedTutorials(1, 100);
    setTutorials(data.tutorials);
    setIsLoading(false);
  };

  const navigateToTutorial = (slug: string) => {
    window.location.hash = `/how-to-use/${slug}`;
  };

  // Group tutorials: separate parents and children
  const topLevel = tutorials.filter(t => !t.parentId);
  const children = tutorials.filter(t => t.parentId);

  // Get unique categories in order
  const categories = Array.from(new Set(topLevel.map(t => t.category || 'General')));

  // Group top-level by category
  const grouped = categories.map(cat => ({
    category: cat,
    tutorials: topLevel
      .filter(t => (t.category || 'General') === cat)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  }));

  // Get children for a parent
  const getChildren = (parentId: string) =>
    children
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TutorialsNavbar onBack={onBack} />

      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Guides</h1>
          <p className="text-slate-500 mt-3 text-lg">Step-by-step guides to help you get the most out of OpenHR</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={40} />
              <p className="text-slate-500">Loading tutorials...</p>
            </div>
          ) : tutorials.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No tutorials published yet. Check back soon!</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-10">
                {grouped.map(group => (
                  <div key={group.category} id={`cat-${group.category.toLowerCase().replace(/\s+/g, '-')}`}>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                      <span className="w-1.5 h-8 bg-primary rounded-full" />
                      {group.category}
                    </h2>
                    <div className="space-y-4">
                      {group.tutorials.map(tutorial => {
                        const tutorialChildren = getChildren(tutorial.id);
                        return (
                          <div key={tutorial.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Parent card */}
                            <div
                              onClick={() => navigateToTutorial(tutorial.slug)}
                              className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              {tutorial.coverImage ? (
                                <img src={tutorial.coverImage} alt={tutorial.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                                  <BookOpen size={24} className="text-primary/40" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-lg">{tutorial.title}</h3>
                                {tutorial.excerpt && (
                                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tutorial.excerpt}</p>
                                )}
                              </div>
                              <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
                            </div>

                            {/* Children sub-links */}
                            {tutorialChildren.length > 0 && (
                              <div className="border-t border-slate-100 bg-slate-50/50">
                                {tutorialChildren.map(child => (
                                  <button
                                    key={child.id}
                                    onClick={() => navigateToTutorial(child.slug)}
                                    className="flex items-center gap-3 w-full text-left px-5 py-3 pl-14 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                                    <span className="text-sm font-medium text-slate-700">{child.title}</span>
                                    <ChevronRight size={14} className="text-slate-400 ml-auto flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Sidebar - Category Jump Links */}
              <div className="lg:w-72 flex-shrink-0">
                <div className="lg:sticky lg:top-24">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Categories</h4>
                    <nav className="space-y-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            const el = document.getElementById(`cat-${cat.toLowerCase().replace(/\s+/g, '-')}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TutorialsFooter />
    </div>
  );
};

export default TutorialsPage;
