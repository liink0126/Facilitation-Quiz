import React from 'react';
import { XIcon } from './icons';

interface SidebarProps {
  topics: string[];
  selectedTopic: string | null;
  onSelectTopic: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  answeredTopics: Set<string>;
  incorrectTopics: Set<string>;
  showOnlyIncorrect: boolean;
  onToggleShowOnlyIncorrect: () => void;
  totalTopics?: number;
  statistics?: {
    totalAnswered: number;
    totalCorrect: number;
    totalIncorrect: number;
    topicStats: Record<string, { correct: number; incorrect: number; attempts: number }>;
  };
  quizMode?: 'learning' | 'exam' | 'review';
  onQuizModeChange?: (mode: 'learning' | 'exam' | 'review') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  topics, 
  selectedTopic, 
  onSelectTopic, 
  isOpen, 
  onClose,
  isCollapsed,
  onToggleCollapse,
  answeredTopics,
  incorrectTopics,
  showOnlyIncorrect,
  onToggleShowOnlyIncorrect,
  totalTopics = 0,
  statistics,
  quizMode = 'learning',
  onQuizModeChange
}) => {
  const filteredTopics = showOnlyIncorrect 
    ? topics.filter((topic, index) => incorrectTopics.has(topic))
    : topics;

  const getTopicStatus = (topic: string) => {
    if (incorrectTopics.has(topic)) {
      return 'incorrect'; // 틀린 문제
    } else if (answeredTopics.has(topic)) {
      return 'correct'; // 맞춘 문제
    }
    return 'unanswered'; // 아직 안 푼 문제
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 h-full bg-white shadow-xl flex-shrink-0 fixed sm:relative inset-y-0 left-0 z-30">
        <button
          onClick={onToggleCollapse}
          className="w-full h-12 flex items-center justify-center hover:bg-slate-100 transition-colors"
          aria-label="Expand sidebar"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className={`w-56 lg:w-64 h-full bg-white shadow-xl flex-shrink-0 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0`}>
      <div className="flex justify-between items-center p-4">
        <h1 className="text-lg font-bold text-[#d83968]">Let's Facilitation!</h1>
        <div className="flex items-center gap-2">
          <button 
            className="hidden sm:block text-slate-500 hover:text-slate-800 p-1" 
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="sm:hidden text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close menu">
            <XIcon />
          </button>
        </div>
      </div>
      
      {/* 진행률 및 통계 */}
      {totalTopics > 0 && (
        <div className="p-3 bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">진행률</p>
              <p className="text-xs font-bold text-pink-700">
                {answeredTopics.size} / {totalTopics}
              </p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(answeredTopics.size / totalTopics) * 100}%` }}
              ></div>
            </div>
          </div>
          {statistics && statistics.totalAnswered > 0 && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <p className="font-bold text-emerald-600">{statistics.totalCorrect}</p>
                <p className="text-slate-500">정답</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-rose-600">{statistics.totalIncorrect}</p>
                <p className="text-slate-500">오답</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">
                  {statistics.totalCorrect > 0 
                    ? Math.round((statistics.totalCorrect / statistics.totalAnswered) * 100)
                    : 0}%
                </p>
                <p className="text-slate-500">정답률</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 모드 선택 */}
      {onQuizModeChange && (
        <div className="p-3 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2">모드 선택</p>
          <div className="flex gap-1">
            {(['learning', 'exam', 'review'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onQuizModeChange(mode)}
                className={`flex-1 text-xs px-2 py-1.5 rounded transition-colors ${
                  quizMode === mode
                    ? 'bg-pink-100 text-pink-700 font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                aria-label={`${mode === 'learning' ? '학습' : mode === 'exam' ? '시험' : '복습'} 모드`}
              >
                {mode === 'learning' ? '학습' : mode === 'exam' ? '시험' : '복습'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-500">퀴즈 목차</p>
          {incorrectTopics.size > 0 && (
            <button
              onClick={onToggleShowOnlyIncorrect}
              className={`text-sm px-2.5 py-1.5 rounded transition-colors ${
                showOnlyIncorrect
                  ? 'bg-rose-100 text-rose-700 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              틀린 문제만
            </button>
          )}
        </div>
        {showOnlyIncorrect && (
          <p className="text-sm text-rose-600 mt-1">
            틀린 문제 {incorrectTopics.size}개
          </p>
        )}
      </div>
      
      <nav className="px-3 pb-4">
        <ul>
          {filteredTopics.map((topic, index) => {
            const status = getTopicStatus(topic);
            const originalIndex = topics.indexOf(topic);
            
            let statusColor = '';
            let statusIcon = null;
            
            if (status === 'correct') {
              statusColor = 'border-l-4 border-emerald-500 bg-emerald-50';
              statusIcon = (
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              );
            } else if (status === 'incorrect') {
              statusColor = 'border-l-4 border-rose-500 bg-rose-50';
              statusIcon = (
                <svg className="w-5 h-5 text-rose-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              );
            }
            
            return (
              <li key={topic}>
                <button
                  onClick={() => {
                    onSelectTopic(originalIndex);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2.5 my-0.5 text-sm rounded-md transition-all duration-150 flex items-center gap-2.5 ${
                    selectedTopic === topic
                      ? 'bg-pink-100 text-[#d83968] font-bold'
                      : status === 'correct'
                      ? 'text-emerald-800 hover:bg-emerald-100'
                      : status === 'incorrect'
                      ? 'text-rose-800 hover:bg-rose-100'
                      : 'text-slate-600 hover:bg-pink-50 hover:text-slate-900'
                  } ${statusColor}`}
                >
                  {statusIcon}
                  <span className="truncate leading-relaxed">{topic}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {showOnlyIncorrect && filteredTopics.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-base">
            틀린 문제가 없습니다!
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;