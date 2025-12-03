import React from 'react';
import { XIcon } from './icons';
import type { Gamification } from '../types';

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
  gamification?: Gamification;
  unlockedTopics?: number;
  viewedContent?: Set<string>;
  passedExams?: Set<string>;
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
  onQuizModeChange,
  gamification,
  unlockedTopics = 0,
  viewedContent = new Set(),
  passedExams = new Set()
}) => {
  const filteredTopics = showOnlyIncorrect 
    ? topics.filter((topic, index) => incorrectTopics.has(topic))
    : topics;

  const getTopicStatus = (topic: string) => {
    if (passedExams.has(topic)) {
      return 'passed'; // 시험 통과
    } else if (viewedContent.has(topic)) {
      return 'studied'; // 학습 완료 (시험 미통과)
    } else if (incorrectTopics.has(topic)) {
      return 'incorrect'; // 틀린 문제 (복습 모드)
    } else if (answeredTopics.has(topic)) {
      return 'answered'; // 답변함 (복습 모드)
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
        <h1 className="text-lg font-bold text-[#d83968]">Liink Challengers</h1>
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
      
      {/* 게이미피케이션 정보 */}
      {gamification && (
        <div className="mx-3 mb-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-xs text-slate-500">레벨</p>
                <p className="text-lg font-bold text-purple-700">{gamification.level}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">포인트</p>
              <p className="text-lg font-bold text-pink-700">{gamification.points}</p>
            </div>
          </div>
          {gamification.streak > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-white/60 rounded">
              <span className="text-xl">🔥</span>
              <p className="text-xs text-slate-700"><span className="font-bold">{gamification.streak}일</span> 연속 학습</p>
            </div>
          )}
          {gamification.badges.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">획득 배지 ({gamification.badges.length})</p>
              <div className="flex flex-wrap gap-1">
                {gamification.badges.slice(0, 8).map((badgeId) => {
                  const badge = [
                    { id: 'first_step', icon: '🎯' },
                    { id: 'beginner', icon: '⭐' },
                    { id: 'intermediate', icon: '🌟' },
                    { id: 'advanced', icon: '✨' },
                    { id: 'master', icon: '🏆' },
                    { id: 'streak_3', icon: '🔥' },
                    { id: 'streak_7', icon: '💪' },
                    { id: 'perfectionist', icon: '💯' },
                  ].find(b => b.id === badgeId);
                  return badge ? <span key={badgeId} className="text-lg">{badge.icon}</span> : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 진행률 및 통계 */}
      {totalTopics > 0 && (
        <div className="p-3 bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">진행률</p>
              <p className="text-xs font-bold text-pink-700">
                {passedExams.size} / {totalTopics}
              </p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(passedExams.size / totalTopics) * 100}%` }}
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
            // 학습 모드: 잠금 해제되지 않은 주제는 잠금
            // 시험 모드: 학습 완료하지 않은 주제는 잠금
            const isLocked = quizMode === 'learning' 
              ? originalIndex > unlockedTopics
              : quizMode === 'exam' && !viewedContent.has(topic);
            
            let statusColor = '';
            let statusIcon = null;
            
            if (isLocked) {
              statusColor = 'bg-slate-100 opacity-60';
              statusIcon = (
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              );
            } else if (status === 'passed') {
              // 시험 통과
              statusColor = 'border-l-4 border-emerald-500 bg-emerald-50';
              statusIcon = (
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              );
            } else if (status === 'studied') {
              // 학습 완료 (시험 미통과)
              statusColor = 'border-l-4 border-blue-500 bg-blue-50';
              statusIcon = (
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              );
            } else if (status === 'incorrect') {
              statusColor = 'border-l-4 border-rose-500 bg-rose-50';
              statusIcon = (
                <svg className="w-5 h-5 text-rose-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              );
            } else if (status === 'answered') {
              statusColor = 'border-l-4 border-yellow-500 bg-yellow-50';
              statusIcon = (
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              );
            }
            
            return (
            <li key={topic}>
              <button
                onClick={() => {
                  if (!isLocked) {
                    onSelectTopic(originalIndex);
                  onClose();
                  }
                }}
                disabled={isLocked}
                  className={`w-full text-left px-3 py-2.5 my-0.5 text-sm rounded-md transition-all duration-150 flex items-center gap-2.5 ${
                  isLocked 
                    ? 'cursor-not-allowed text-slate-400'
                    : selectedTopic === topic
                    ? 'bg-pink-100 text-[#d83968] font-bold'
                      : status === 'passed'
                      ? 'text-emerald-800 hover:bg-emerald-100'
                      : status === 'studied'
                      ? 'text-blue-800 hover:bg-blue-100'
                      : status === 'incorrect'
                      ? 'text-rose-800 hover:bg-rose-100'
                      : status === 'answered'
                      ? 'text-yellow-800 hover:bg-yellow-100'
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