import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import QuizArea from './components/QuizArea';
import { TOPICS } from './constants';
import { QUIZ_DATA } from './quizData';
import { TOPIC_CONTENT } from './content';
import type { Quiz } from './types';
import { MenuIcon } from './components/icons';
import { generatePersonalizedExplanation } from './services/geminiService';

const QUIZ_DURATION = 40; // seconds
const STORAGE_KEY = 'facilitation-quiz-progress';

// 틀린 문제 정보를 저장하는 타입
interface IncorrectAnswer {
  topic: string;
  incorrectOption: string;
  isRetrying: boolean; // 다시 풀고 있는지 여부
}

// 학습 모드 타입
type QuizMode = 'practice' | 'exam' | 'review';

// 통계 정보 타입
interface Statistics {
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  topicStats: Record<string, { correct: number; incorrect: number; attempts: number }>;
}

// 로컬 스토리지 저장 데이터 타입
interface SavedProgress {
  answeredTopics: string[];
  incorrectAnswers: Array<{ topic: string; incorrectOption: string; isRetrying: boolean }>;
  currentTopicIndex: number;
  quizMode: QuizMode;
  statistics: Statistics;
}

export default function App(): React.ReactElement {
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [topicContent, setTopicContent] = useState<string | null>(null);
  const [userSelection, setUserSelection] = useState<string | null>(null);
  const [incorrectSelections, setIncorrectSelections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [timerActive, setTimerActive] = useState(true);
  const [answeredTopics, setAnsweredTopics] = useState<Set<string>>(new Set());
  const [incorrectAnswers, setIncorrectAnswers] = useState<Map<string, IncorrectAnswer>>(new Map());
  const [personalizedExplanation, setPersonalizedExplanation] = useState<string | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [statistics, setStatistics] = useState<Statistics>({
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    topicStats: {}
  });
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // 틀린 문제 목록 (복습용)
  const incorrectTopics = useMemo(() => {
    const topics = new Set<string>();
    incorrectAnswers.forEach((value, key) => {
      if (!value.isRetrying) {
        topics.add(key);
      }
    });
    return topics;
  }, [incorrectAnswers]);

  const selectedTopic = TOPICS[currentTopicIndex];
  const topicsWithQuizzes = useMemo(() => {
    if (quizMode === 'review') {
      return TOPICS.filter(t => QUIZ_DATA[t]?.question && incorrectTopics.has(t));
    }
    return TOPICS.filter(t => QUIZ_DATA[t]?.question);
  }, [quizMode, incorrectTopics]);
  const isQuizComplete = answeredTopics.size === topicsWithQuizzes.length;
  
  // 통계 업데이트
  const updateStatistics = useCallback((topic: string, isCorrect: boolean) => {
    setStatistics(prev => {
      const topicStat = prev.topicStats[topic] || { correct: 0, incorrect: 0, attempts: 0 };
      return {
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        totalIncorrect: prev.totalIncorrect + (isCorrect ? 0 : 1),
        topicStats: {
          ...prev.topicStats,
          [topic]: {
            correct: topicStat.correct + (isCorrect ? 1 : 0),
            incorrect: topicStat.incorrect + (isCorrect ? 0 : 1),
            attempts: topicStat.attempts + 1
          }
        }
      };
    });
  }, []);

  // 학습 모드에 따른 설정
  const quizModeSettings = useMemo(() => {
    switch (quizMode) {
      case 'practice':
        return { hasTimer: false, allowRetry: true, showExplanation: true };
      case 'exam':
        return { hasTimer: true, allowRetry: false, showExplanation: true };
      case 'review':
        return { hasTimer: false, allowRetry: true, showExplanation: true };
      default:
        return { hasTimer: true, allowRetry: true, showExplanation: true };
    }
  }, [quizMode]);

  // 핸들러 함수들을 먼저 정의
  const handleSelectTopic = useCallback((index: number): void => {
    if (index < 0 || index >= TOPICS.length) return;
    
    setCurrentTopicIndex(index);
    setUserSelection(null);
    setIncorrectSelections([]);
    setError(null);
    setTimerActive(true);
    setPersonalizedExplanation(null);
    startTimeRef.current = Date.now();

    const topic = TOPICS[index];
    const quizData = (QUIZ_DATA as Record<string, Quiz>)[topic];
    const contentData = (TOPIC_CONTENT as Record<string, string>)[topic];
    
    setTopicContent(contentData || null);

    if (!contentData && (!quizData || !quizData.question)) {
      setError('이 주제에 대한 학습 자료가 아직 준비되지 않았습니다.');
      setQuiz(null);
    } else {
      setQuiz((quizData && quizData.question) ? quizData : null);
    }
  }, []);

  const handleOptionSelect = useCallback(async (option: string): Promise<void> => {
    if (userSelection) return;
    
    setTimerActive(false); // Stop timer on selection

    const currentQuiz = (QUIZ_DATA as Record<string, Quiz>)[selectedTopic!];
    if (!currentQuiz) return;

    const newAnsweredTopics = new Set(answeredTopics).add(selectedTopic);

    // FIX: Check quiz type before accessing `correctAnswer` to avoid type errors.
    // `correctAnswer` is only available on `MultipleChoiceQuiz`.
    const isCorrect =
      (currentQuiz.type === 'multiple-choice' && option === currentQuiz.correctAnswer) ||
      (currentQuiz.type === 'matching'); // For matching quizzes, submitting marks it as complete.

    if (isCorrect) {
      setUserSelection(option);
      updateStatistics(selectedTopic!, true);
      
      // 틀렸던 문제를 다시 맞췄는지 확인
      const incorrectAnswer = incorrectAnswers.get(selectedTopic!);
      if (incorrectAnswer && incorrectAnswer.isRetrying && currentQuiz.type === 'multiple-choice') {
        // 맞춤형 해설 생성
        setIsGeneratingExplanation(true);
        try {
          const personalized = await generatePersonalizedExplanation(
            currentQuiz.question,
            currentQuiz.correctAnswer,
            incorrectAnswer.incorrectOption,
            currentQuiz.explanation
          );
          setPersonalizedExplanation(personalized);
          // 틀린 문제 목록에서 제거
          const newIncorrectAnswers = new Map(incorrectAnswers);
          newIncorrectAnswers.delete(selectedTopic!);
          setIncorrectAnswers(newIncorrectAnswers);
          // 이제 정답을 맞췄으므로 answeredTopics에 추가
          setAnsweredTopics(newAnsweredTopics);
        } catch (error) {
          console.error('맞춤형 해설 생성 실패:', error);
          // 에러 메시지를 사용자에게 표시 (5초 후 자동 제거)
          if (error instanceof Error) {
            const errorMsg = error.message || '맞춤형 해설 생성 중 오류가 발생했습니다.';
            setError(errorMsg);
            setTimeout(() => setError(null), 5000);
          }
          setPersonalizedExplanation(null);
          // 해설 생성 실패해도 정답을 맞췄으므로 answeredTopics에 추가
          setAnsweredTopics(newAnsweredTopics);
        } finally {
          setIsGeneratingExplanation(false);
        }
      } else {
        // 처음부터 맞춘 경우
        setAnsweredTopics(newAnsweredTopics);
      }
    } else {
      updateStatistics(selectedTopic!, false);
      const newIncorrectSelections = [...incorrectSelections, option];
      setIncorrectSelections(newIncorrectSelections);

      // 틀린 답을 저장
      if (currentQuiz.type === 'multiple-choice') {
        const newIncorrectAnswers = new Map(incorrectAnswers);
        newIncorrectAnswers.set(selectedTopic!, {
          topic: selectedTopic!,
          incorrectOption: option,
          isRetrying: false
        });
        setIncorrectAnswers(newIncorrectAnswers);
      }

      // 틀렸을 때는 userSelection을 설정하지 않아서 계속 선택할 수 있게 함
      // 정답을 맞출 때까지 계속 시도 가능
    }
  }, [userSelection, selectedTopic, incorrectSelections, answeredTopics, incorrectAnswers, updateStatistics]);

  // 로컬 스토리지에서 진행 상황 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const progress: SavedProgress = JSON.parse(saved);
        setAnsweredTopics(new Set(progress.answeredTopics || []));
        const incorrectMap = new Map<string, IncorrectAnswer>();
        (progress.incorrectAnswers || []).forEach(item => {
          incorrectMap.set(item.topic, item);
        });
        setIncorrectAnswers(incorrectMap);
        setCurrentTopicIndex(progress.currentTopicIndex || 0);
        setQuizMode(progress.quizMode || 'practice');
        if (progress.statistics) {
          setStatistics(progress.statistics);
        }
      }
    } catch (error) {
      console.error('진행 상황 로드 실패:', error);
    }
  }, []);

  // 진행 상황 자동 저장
  useEffect(() => {
    try {
      const progress: SavedProgress = {
        answeredTopics: Array.from(answeredTopics),
        incorrectAnswers: Array.from(incorrectAnswers.entries()).map(([topic, answer]) => ({
          topic,
          incorrectOption: answer.incorrectOption,
          isRetrying: answer.isRetrying
        })),
        currentTopicIndex,
        quizMode,
        statistics
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('진행 상황 저장 실패:', error);
    }
  }, [answeredTopics, incorrectAnswers, currentTopicIndex, quizMode, statistics]);

  // 다크 모드 감지 및 적용
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 초기 로드 시 저장된 위치로 이동
  useEffect(() => {
    if (isInitialized) return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress: SavedProgress = JSON.parse(saved);
        if (progress.currentTopicIndex !== undefined && 
            progress.currentTopicIndex >= 0 && 
            progress.currentTopicIndex < TOPICS.length) {
          handleSelectTopic(progress.currentTopicIndex);
          setIsInitialized(true);
          return;
        }
      } catch (error) {
        console.error('저장된 위치 로드 실패:', error);
      }
    }
    handleSelectTopic(0);
    setIsInitialized(true);
  }, [isInitialized, handleSelectTopic]);

  // 복습 모드: 틀린 문제만 필터링
  useEffect(() => {
    if (quizMode === 'review' && incorrectTopics.size > 0 && isInitialized) {
      const firstIncorrectIndex = TOPICS.findIndex(topic => incorrectTopics.has(topic));
      if (firstIncorrectIndex !== -1 && currentTopicIndex !== firstIncorrectIndex) {
        handleSelectTopic(firstIncorrectIndex);
      }
    }
  }, [quizMode, incorrectTopics, isInitialized, currentTopicIndex, handleSelectTopic]);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd 키 조합은 무시 (브라우저 단축키)
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (currentTopicIndex < TOPICS.length - 1) {
            handleSelectTopic(currentTopicIndex + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentTopicIndex > 0) {
            handleSelectTopic(currentTopicIndex - 1);
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          if (quiz && quiz.type === 'multiple-choice' && quiz.options && !userSelection) {
            const index = parseInt(e.key) - 1;
            if (quiz.options[index] && index < quiz.options.length) {
              handleOptionSelect(quiz.options[index]);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTopicIndex, quiz, userSelection, handleSelectTopic, handleOptionSelect]);

  useEffect(() => {
    setTimeLeft(quizModeSettings.hasTimer ? QUIZ_DURATION : Infinity);
    startTimeRef.current = Date.now();
  }, [selectedTopic, quizModeSettings.hasTimer]);

  // 타이머 최적화: requestAnimationFrame 사용
  useEffect(() => {
    if (userSelection || !timerActive || !quiz?.question || !quizModeSettings.hasTimer) {
      return;
    }

    if (timeLeft <= 0) {
      setTimerActive(false);
      const newIncorrectSelections = [...incorrectSelections, 'TIME_UP'];
      setIncorrectSelections(newIncorrectSelections);

      if (newIncorrectSelections.length >= 2) {
        setUserSelection('TIME_UP');
        updateStatistics(selectedTopic!, false);
        const newIncorrectAnswers = new Map(incorrectAnswers);
        newIncorrectAnswers.set(selectedTopic!, {
          topic: selectedTopic!,
          incorrectOption: 'TIME_UP',
          isRetrying: false
        });
        setIncorrectAnswers(newIncorrectAnswers);
      }
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeLeft, userSelection, timerActive, quiz, selectedTopic, incorrectSelections, quizModeSettings.hasTimer, incorrectAnswers, updateStatistics]);

  const handleNextQuestion = useCallback((): void => {
    if (currentTopicIndex < TOPICS.length - 1) {
      handleSelectTopic(currentTopicIndex + 1);
    }
  }, [currentTopicIndex, handleSelectTopic]);

  const handlePreviousQuestion = useCallback((): void => {
    if (currentTopicIndex > 0) {
      handleSelectTopic(currentTopicIndex - 1);
    }
  }, [currentTopicIndex, handleSelectTopic]);

  const handleRetryQuiz = useCallback((): void => {
    // 다시 풀기 시작
    const newIncorrectAnswers = new Map(incorrectAnswers);
    const incorrectAnswer = newIncorrectAnswers.get(selectedTopic!) as IncorrectAnswer | undefined;
    if (incorrectAnswer) {
      const updatedAnswer: IncorrectAnswer = {
        topic: incorrectAnswer.topic,
        incorrectOption: incorrectAnswer.incorrectOption,
        isRetrying: true
      };
      newIncorrectAnswers.set(selectedTopic!, updatedAnswer);
      setIncorrectAnswers(newIncorrectAnswers);
    }
    
    // 퀴즈 상태 초기화
    setUserSelection(null);
    setIncorrectSelections([]);
    setPersonalizedExplanation(null);
    setTimerActive(true);
    setTimeLeft(quizModeSettings.hasTimer ? QUIZ_DURATION : Infinity);
    setError(null);
  }, [selectedTopic, incorrectAnswers, quizModeSettings.hasTimer]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      <Sidebar 
        topics={TOPICS} 
        selectedTopic={selectedTopic}
        onSelectTopic={(index) => {
          handleSelectTopic(index);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        answeredTopics={answeredTopics}
        incorrectTopics={incorrectTopics}
        showOnlyIncorrect={showOnlyIncorrect}
        onToggleShowOnlyIncorrect={() => setShowOnlyIncorrect(!showOnlyIncorrect)}
        totalTopics={topicsWithQuizzes.length}
        statistics={statistics}
        quizMode={quizMode}
        onQuizModeChange={setQuizMode}
        darkMode={darkMode}
        onDarkModeToggle={() => {
          const newDarkMode = !darkMode;
          setDarkMode(newDarkMode);
          if (newDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }}
      />
      <main className={`flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto transition-all duration-300 bg-slate-50`}>
         <header className="sm:hidden mb-4 flex items-center">
          <button 
            className="p-2 -ml-2 text-slate-600 hover:text-[#d83968]"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <h1 className="text-lg font-bold text-[#d83968] ml-2">Let's Facilitation!</h1>
        </header>
        <QuizArea
          selectedTopic={selectedTopic}
          topicContent={topicContent}
          quiz={quiz}
          userSelection={userSelection}
          incorrectSelections={incorrectSelections}
          error={error}
          onOptionSelect={handleOptionSelect}
          onNextQuiz={handleNextQuestion}
          onPreviousQuestion={handlePreviousQuestion}
          isQuizComplete={isQuizComplete}
          timeLeft={timeLeft}
          quizDuration={QUIZ_DURATION}
          isFirstQuestion={currentTopicIndex === 0}
          isLastQuestion={currentTopicIndex === TOPICS.length - 1}
          hasIncorrectAnswer={incorrectAnswers.has(selectedTopic!) && !incorrectAnswers.get(selectedTopic!)?.isRetrying}
          onRetryQuiz={handleRetryQuiz}
          personalizedExplanation={personalizedExplanation}
          isGeneratingExplanation={isGeneratingExplanation}
          currentQuestionNumber={currentTopicIndex + 1}
          totalQuestions={topicsWithQuizzes.length}
          hasTimer={quizModeSettings.hasTimer}
        />
      </main>
    </div>
  );
}
