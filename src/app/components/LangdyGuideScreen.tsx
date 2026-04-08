'use client';

import React, { useState, useRef, useEffect } from 'react';
import { companySections, GuideItem } from '../data/company-guide';

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  );
}

function containsQuery(item: GuideItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  if (typeof item.content === 'string') return item.content.toLowerCase().includes(q);
  return (item.content as GuideItem[]).some(child => containsQuery(child, query));
}

function GuideItemBlock({ item, query }: { item: GuideItem; query: string }) {
  if (!containsQuery(item, query)) return null;

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-gray-700 text-sm mb-1.5">
        {highlight(item.title, query)}
      </h4>
      {typeof item.content === 'string' ? (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100">
          {highlight(item.content, query)}
        </div>
      ) : (
        <div className="pl-3 border-l-2 border-orange-100 space-y-3">
          {(item.content as GuideItem[]).map((child, i) => (
            <GuideItemBlock key={i} item={child} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LangdyGuideScreen() {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('basics');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 검색 시 첫 매칭 섹션으로 자동 이동
  useEffect(() => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    for (const section of companySections) {
      const match =
        section.title.toLowerCase().includes(q) ||
        section.items.some(item => containsQuery(item, q));
      if (match) {
        setActiveSection(section.id);
        sectionRefs.current[section.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }, [query]);

  return (
    <div className="flex gap-6 max-w-5xl">

      {/* 좌측 섹션 네비 */}
      <div className="hidden lg:flex flex-col w-44 shrink-0">
        <div className="sticky top-6 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">목차</p>
          {companySections.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all ${
                activeSection === section.id
                  ? 'bg-orange-50 text-orange-500 font-semibold'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">

        {/* 헤더 + 검색 */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 mb-1">너랑 랭디랑 🧡</h2>
          <p className="text-sm text-gray-400 mb-5">랭디에서 생활하는 데 필요한 모든 정보를 모았어요.</p>

          {/* 검색창 */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요 (예: 휴가, WIFI, 식대)"
              className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* 모바일용 섹션 탭 */}
          <div className="flex gap-2 mt-4 lg:hidden overflow-x-auto pb-1">
            {companySections.map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {section.icon} {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* 섹션별 콘텐츠 */}
        <div className="space-y-10">
          {companySections.map(section => {
            const hasMatch =
              !query.trim() ||
              section.title.toLowerCase().includes(query.toLowerCase()) ||
              section.items.some(item => containsQuery(item, query));

            if (!hasMatch) return null;

            return (
              <div
                key={section.id}
                ref={el => { sectionRefs.current[section.id] = el; }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-2xl">{section.icon}</span>
                  <h3 className="text-lg font-black text-gray-800">
                    {highlight(section.title, query)}
                  </h3>
                  <div className="flex-1 h-px bg-gray-100 ml-2" />
                </div>

                <div className="space-y-5">
                  {section.items.map((item, i) => {
                    if (!containsQuery(item, query)) return null;
                    return (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h3 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                          {highlight(item.title, query)}
                        </h3>
                        {typeof item.content === 'string' ? (
                          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 rounded-xl p-4 border border-gray-100">
                            {highlight(item.content, query)}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(item.content as GuideItem[]).map((child, j) => (
                              <GuideItemBlock key={j} item={child} query={query} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 검색 결과 없음 */}
          {query.trim() && companySections.every(section =>
            !section.title.toLowerCase().includes(query.toLowerCase()) &&
            !section.items.some(item => containsQuery(item, query))
          ) && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">"{query}"에 대한 검색 결과가 없어요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
