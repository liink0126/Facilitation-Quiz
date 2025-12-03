import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import QuizArea from './components/QuizArea';
import { TOPICS } from './constants';
import { QUIZ_DATA } from './quizData';
import { TOPIC_CONTENT } from './content';
import type { Quiz, Gamification, Badge } from './types';
import { MenuIcon } from './components/icons';
import { generatePersonalizedExplanation } from './services/geminiService';

const QUIZ_DURATION = 40; // seconds
const STORAGE_KEY = 'liink-challengers-progress';

// 배지 정의
const BADGES: Badge[] = [
  { id: 'first_step', name: '첫 걸음', description: '첫 번째 학습 완료', icon: '🎯', condition: (g) => g.completedTopicsCount >= 1 },
  { id: 'beginner', name: '초보 챌린저', description: '5개 학습 완료', icon: '⭐', condition: (g) => g.completedTopicsCount >= 5 },
  { id: 'intermediate', name: '중급 챌린저', description: '10개 학습 완료', icon: '🌟', condition: (g) => g.completedTopicsCount >= 10 },
  { id: 'advanced', name: '고급 챌린저', description: '15개 학습 완료', icon: '✨', condition: (g) => g.completedTopicsCount >= 15 },
  { id: 'master', name: '마스터 챌린저', description: '모든 학습 완료', icon: '🏆', condition: (g) => g.completedTopicsCount >= TOPICS.length },
  { id: 'streak_3', name: '꾸준함', description: '3일 연속 학습', icon: '🔥', condition: (g) => g.streak >= 3 },
  { id: 'streak_7', name: '습관의 힘', description: '7일 연속 학습', icon: '💪', condition: (g) => g.streak >= 7 },
  { id: 'perfectionist', name: '완벽주의자', description: '한 번에 정답 맞추기', icon: '💯', condition: (g) => g.points >= 100 },
];

// 틀린 문제 정보를 저장하는 타입
interface IncorrectAnswer {
  topic: string;
  incorrectOption: string;
  isRetrying: boolean; // 다시 풀고 있는지 여부
}

// 학습 모드 타입
type QuizMode = 'learning' | 'exam' | 'review';

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
  gamification: Gamification;
  unlockedTopics: number; // 잠금 해제된 주제 인덱스
  viewedContent: string[]; // 학습 내용을 본 주제들 (학습 완료)
  passedExams: string[]; // 시험 통과한 주제들
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
  const [quizMode, setQuizMode] = useState<QuizMode>('learning');
  const [statistics, setStatistics] = useState<Statistics>({
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    topicStats: {}
  });
  const [gamification, setGamification] = useState<Gamification>({
    points: 0,
    level: 1,
    badges: [],
    streak: 0,
    lastStudyDate: '',
    completedTopicsCount: 0
  });
  const [unlockedTopics, setUnlockedTopics] = useState(0); // 잠금 해제된 주제 수 (0이면 첫 번째만)
  const [viewedContent, setViewedContent] = useState<Set<string>>(new Set()); // 학습 완료한 주제들
  const [passedExams, setPassedExams] = useState<Set<string>>(new Set()); // 시험 통과한 주제들
  const [showBadgeNotification, setShowBadgeNotification] = useState<Badge | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // 설계 방법론 그룹 문제들
  const DESIGN_METHODOLOGY_QUIZZES = ["설계 방법론", "설계 방법론_2", "설계 방법론_3", "설계 방법론_4"];
  const [currentMethodologyQuizIndex, setCurrentMethodologyQuizIndex] = useState(0);
  
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
  const isDesignMethodology = selectedTopic === "설계 방법론";
  const currentMethodologyQuizKey = isDesignMethodology 
    ? DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex] 
    : selectedTopic;
  
  const topicsWithQuizzes = useMemo(() => {
    if (quizMode === 'review') {
      return TOPICS.filter(t => {
        if (t === "설계 방법론") {
          // 설계 방법론의 경우, 그룹 내 문제 중 틀린 것이 있는지 확인
          return DESIGN_METHODOLOGY_QUIZZES.some(q => incorrectTopics.has(q));
        }
        return QUIZ_DATA[t]?.question && incorrectTopics.has(t);
      });
    }
    return TOPICS.filter(t => {
      if (t === "설계 방법론") {
        return QUIZ_DATA[DESIGN_METHODOLOGY_QUIZZES[0]]?.question;
      }
      return QUIZ_DATA[t]?.question;
    });
  }, [quizMode, incorrectTopics]);
  const isQuizComplete = passedExams.size === topicsWithQuizzes.length;
  
  // 게이미피케이션: 포인트 계산
  const calculatePoints = useCallback((isCorrect: boolean, timeLeft: number, attempts: number) => {
    if (!isCorrect) return 0;
    let points = 10; // 기본 점수
    if (attempts === 1) points += 10; // 한 번에 맞추면 보너스
    if (timeLeft > 30) points += 5; // 빠르게 풀면 보너스
    return points;
  }, []);

  // 게이미피케이션: 레벨 계산
  const calculateLevel = useCallback((points: number) => {
    return Math.floor(points / 100) + 1;
  }, []);

  // 게이미피케이션: 연속 학습일 업데이트
  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    setGamification(prev => {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (prev.lastStudyDate === today) {
        return prev; // 오늘 이미 학습함
      } else if (prev.lastStudyDate === yesterday) {
        // 어제 학습했으면 연속 증가
        return { ...prev, streak: prev.streak + 1, lastStudyDate: today };
      } else if (prev.lastStudyDate === '') {
        // 첫 학습
        return { ...prev, streak: 1, lastStudyDate: today };
      } else {
        // 연속 끊김
        return { ...prev, streak: 1, lastStudyDate: today };
      }
    });
  }, []);

  // 게이미피케이션: 배지 확인 및 부여
  const checkAndAwardBadges = useCallback((newGamification: Gamification) => {
    const newBadges: string[] = [];
    BADGES.forEach(badge => {
      if (!newGamification.badges.includes(badge.id) && badge.condition(newGamification)) {
        newBadges.push(badge.id);
        // 배지 알림 표시
        setShowBadgeNotification(badge);
        setTimeout(() => setShowBadgeNotification(null), 3000);
      }
    });
    if (newBadges.length > 0) {
      setGamification(prev => ({ ...prev, badges: [...prev.badges, ...newBadges] }));
    }
  }, []);
  
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
      case 'learning':
        return { hasTimer: false, allowRetry: true, showExplanation: false, showContent: true, showQuiz: false };
      case 'exam':
        return { hasTimer: true, allowRetry: false, showExplanation: true, showContent: false, showQuiz: true };
      case 'review':
        return { hasTimer: false, allowRetry: true, showExplanation: true, showContent: false, showQuiz: true };
      default:
        return { hasTimer: true, allowRetry: true, showExplanation: true, showContent: false, showQuiz: true };
    }
  }, [quizMode]);

  // 학습 내용 보기 완료 처리 및 시험 모드로 전환
  const handleContentViewed = useCallback((topic: string) => {
    console.log('문제 풀기 버튼 클릭 - 학습 완료 처리:', topic);
    
    // 학습 완료 처리
    setViewedContent(prev => {
      const newSet = new Set([...prev, topic]);
      console.log('업데이트된 viewedContent:', newSet);
      return newSet;
    });
    
    // 시험 모드로 자동 전환
    setError(null);
    setQuizMode('exam');
    
    // 현재 주제의 퀴즈 로드
    const isDesignMethodology = topic === "설계 방법론";
    const quizKey = isDesignMethodology ? DESIGN_METHODOLOGY_QUIZZES[0] : topic;
    const quizData = (QUIZ_DATA as Record<string, Quiz>)[quizKey];
    
    console.log('퀴즈 로드 시도:', quizKey, quizData ? '퀴즈 있음' : '퀴즈 없음');
    
    if (quizData && quizData.question) {
      setQuiz(quizData);
      console.log('퀴즈 설정 완료');
    } else {
      console.error('퀴즈 데이터를 찾을 수 없습니다:', quizKey);
      setError('이 주제에 대한 퀴즈가 아직 준비되지 않았습니다.');
    }
    
    // 퀴즈 상태 초기화
    setUserSelection(null);
    setIncorrectSelections([]);
    setPersonalizedExplanation(null);
    setTimerActive(true);
    setTimeLeft(QUIZ_DURATION);
    startTimeRef.current = Date.now();
  }, []);

  // 핸들러 함수들을 먼저 정의
  const handleSelectTopic = useCallback((index: number): void => {
    if (index < 0 || index >= TOPICS.length) return;
    
    const topic = TOPICS[index];
    const topicName = topic;
    
    // 잠금 확인 (학습 모드에서만)
    if (quizMode === 'learning' && index > unlockedTopics) {
      setError(`이전 단계를 먼저 완료해주세요. 현재 ${TOPICS[unlockedTopics]} 단계까지 진행 가능합니다.`);
      return;
    }
    
    // 시험 모드에서는 학습 완료한 주제만 풀 수 있음
    if (quizMode === 'exam' && !viewedContent.has(topicName)) {
      setError(`먼저 학습 모드에서 "${topicName}" 주제를 학습 완료해주세요.`);
      return;
    }
    
    setCurrentTopicIndex(index);
    setUserSelection(null);
    setIncorrectSelections([]);
    setError(null);
    setTimerActive(true);
    setPersonalizedExplanation(null);
    setCurrentMethodologyQuizIndex(0); // 설계 방법론 선택 시 첫 번째 문제로 리셋
    startTimeRef.current = Date.now();

    const isDesignMethodology = topic === "설계 방법론";
    const quizKey = isDesignMethodology ? DESIGN_METHODOLOGY_QUIZZES[0] : topic;
    const quizData = (QUIZ_DATA as Record<string, Quiz>)[quizKey];
    const contentData = (TOPIC_CONTENT as Record<string, string>)[topic];
    
    setTopicContent(contentData || null);

    // 모드에 따라 퀴즈 표시 여부 결정
    if (quizMode === 'learning') {
      // 학습 모드에서는 퀴즈를 보여주지 않음
      setQuiz(null);
    } else if (quizMode === 'exam') {
      // 시험 모드에서는 퀴즈 표시 (학습 완료한 주제만)
      if (viewedContent.has(topicName)) {
        if (quizData && quizData.question) {
          setQuiz(quizData);
        } else {
          setError('이 주제에 대한 퀴즈가 아직 준비되지 않았습니다.');
          setQuiz(null);
        }
      } else {
        // 학습 완료하지 않았지만 시험 모드로 전환된 경우 (문제 풀기 버튼 클릭 후)
        // 퀴즈는 handleContentViewed에서 이미 설정되므로 여기서는 에러만 표시하지 않음
        if (quizData && quizData.question) {
          setQuiz(quizData);
        } else {
          setError('이 주제에 대한 퀴즈가 아직 준비되지 않았습니다.');
          setQuiz(null);
        }
      }
    } else {
      // 복습 모드에서는 퀴즈 표시
      if (!contentData && (!quizData || !quizData.question)) {
        setError('이 주제에 대한 학습 자료가 아직 준비되지 않았습니다.');
        setQuiz(null);
      } else {
        setQuiz((quizData && quizData.question) ? quizData : null);
      }
    }
  }, [quizMode, unlockedTopics, viewedContent]);

  const handleOptionSelect = useCallback(async (option: string): Promise<void> => {
    if (userSelection) return;
    
    setTimerActive(false); // Stop timer on selection

    const isDesignMethodology = selectedTopic === "설계 방법론";
    const currentQuizKey = isDesignMethodology 
      ? DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex] 
      : selectedTopic!;
    const currentQuiz = (QUIZ_DATA as Record<string, Quiz>)[currentQuizKey];
    if (!currentQuiz) return;

    const topicKey = isDesignMethodology ? currentQuizKey : selectedTopic!;
    const newAnsweredTopics = new Set(answeredTopics).add(topicKey);

    // FIX: Check quiz type before accessing `correctAnswer` to avoid type errors.
    // `correctAnswer` is only available on `MultipleChoiceQuiz`.
    const isCorrect =
      (currentQuiz.type === 'multiple-choice' && option === currentQuiz.correctAnswer) ||
      (currentQuiz.type === 'matching'); // For matching quizzes, submitting marks it as complete.

    if (isCorrect) {
      setUserSelection(option);
      updateStatistics(topicKey, true);
      
      // 게이미피케이션: 포인트 부여
      const attempts = incorrectSelections.length + 1;
      const earnedPoints = calculatePoints(true, timeLeft, attempts);
      const newPoints = gamification.points + earnedPoints;
      const newLevel = calculateLevel(newPoints);
      const leveledUp = newLevel > gamification.level;
      
      setGamification(prev => {
        const newGamification = {
          ...prev,
          points: newPoints,
          level: newLevel,
          completedTopicsCount: quizMode === 'exam' && !passedExams.has(topicKey) 
            ? prev.completedTopicsCount + 1 
            : prev.completedTopicsCount
        };
        // 배지 확인
        checkAndAwardBadges(newGamification);
        return newGamification;
      });
      
      // 연속 학습일 업데이트
      updateStreak();
      
      // 레벨업 알림
      if (leveledUp) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }
      
      // 시험 통과 처리 (시험 모드에서만)
      if (quizMode === 'exam') {
        // 시험 통과한 주제에 추가
        if (!passedExams.has(topicKey)) {
          setPassedExams(prev => new Set([...prev, topicKey]));
        }
        
        // 잠금 해제 (시험 통과 시)
        if (currentTopicIndex === unlockedTopics) {
          setUnlockedTopics(prev => Math.min(prev + 1, TOPICS.length - 1));
        }
        
        // 시험 통과 후 3초 후 자동으로 다음 단계로 이동
        if (!isDesignMethodology && currentTopicIndex < TOPICS.length - 1) {
          setTimeout(() => {
            // 다음 주제가 잠금 해제되었으므로 학습 모드로 전환하여 다음 주제 학습 가능하게 함
            setQuizMode('learning');
            handleSelectTopic(currentTopicIndex + 1);
          }, 3000);
        } else if (isDesignMethodology && currentMethodologyQuizIndex === DESIGN_METHODOLOGY_QUIZZES.length - 1 && currentTopicIndex < TOPICS.length - 1) {
          // 설계 방법론의 마지막 문제를 맞추면 다음 주제로 이동
          setTimeout(() => {
            setQuizMode('learning');
            handleSelectTopic(currentTopicIndex + 1);
          }, 3000);
        }
      }
      
      // 설계 방법론의 경우 다음 문제로 이동
      if (isDesignMethodology && currentMethodologyQuizIndex < DESIGN_METHODOLOGY_QUIZZES.length - 1) {
        // 다음 문제로 이동
        setTimeout(() => {
          setCurrentMethodologyQuizIndex(prev => prev + 1);
          setUserSelection(null);
          setIncorrectSelections([]);
          setPersonalizedExplanation(null);
          setTimerActive(true);
          startTimeRef.current = Date.now();
          const nextQuizKey = DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex + 1];
          const nextQuiz = (QUIZ_DATA as Record<string, Quiz>)[nextQuizKey];
          if (nextQuiz) {
            setQuiz(nextQuiz);
          }
        }, 3000); // 3초 후 다음 문제로 이동
      } else if (isDesignMethodology && currentMethodologyQuizIndex === DESIGN_METHODOLOGY_QUIZZES.length - 1 && quizMode === 'learning' && currentTopicIndex < TOPICS.length - 1) {
        // 설계 방법론의 마지막 문제를 맞추면 다음 주제로 이동
        setTimeout(() => {
          handleSelectTopic(currentTopicIndex + 1);
        }, 3000);
      }
      
      // 틀렸던 문제를 다시 맞췄는지 확인
      const incorrectAnswer = incorrectAnswers.get(topicKey);
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
          newIncorrectAnswers.delete(topicKey);
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
        // 설계 방법론의 경우 다음 문제로 이동 (위에서 이미 처리됨)
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
  }, [userSelection, selectedTopic, incorrectSelections, answeredTopics, incorrectAnswers, updateStatistics, currentTopicIndex, currentMethodologyQuizIndex, quizMode, unlockedTopics, timeLeft, calculatePoints, gamification, calculateLevel, checkAndAwardBadges, updateStreak, handleSelectTopic, passedExams]);

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
        setQuizMode(progress.quizMode || 'learning');
        if (progress.statistics) {
          setStatistics(progress.statistics);
        }
        if (progress.gamification) {
          setGamification(progress.gamification);
          // 연속 학습일 확인
          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          if (progress.gamification.lastStudyDate !== today && progress.gamification.lastStudyDate !== yesterday && progress.gamification.lastStudyDate !== '') {
            // 연속 끊김
            setGamification(prev => ({ ...prev, streak: 0 }));
          }
        }
        if (progress.unlockedTopics !== undefined) {
          setUnlockedTopics(progress.unlockedTopics);
        }
        if (progress.viewedContent) {
          setViewedContent(new Set(progress.viewedContent));
        }
        if (progress.passedExams) {
          setPassedExams(new Set(progress.passedExams));
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
        statistics,
        gamification,
        unlockedTopics,
        viewedContent: Array.from(viewedContent),
        passedExams: Array.from(passedExams)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('진행 상황 저장 실패:', error);
    }
  }, [answeredTopics, incorrectAnswers, currentTopicIndex, quizMode, statistics, gamification, unlockedTopics, viewedContent, passedExams]);

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

  // 설계 방법론의 경우 현재 문제 인덱스에 따라 퀴즈 업데이트
  useEffect(() => {
    if (isDesignMethodology) {
      const quizKey = DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex];
      const quizData = (QUIZ_DATA as Record<string, Quiz>)[quizKey];
      if (quizData) {
        setQuiz(quizData);
        setUserSelection(null);
        setIncorrectSelections([]);
        setPersonalizedExplanation(null);
        setTimerActive(true);
        startTimeRef.current = Date.now();
      }
    }
  }, [currentMethodologyQuizIndex, isDesignMethodology]);

  useEffect(() => {
    setTimeLeft(quizModeSettings.hasTimer ? QUIZ_DURATION : Infinity);
    startTimeRef.current = Date.now();
  }, [selectedTopic, currentMethodologyQuizKey, quizModeSettings.hasTimer]);

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
        const isDesignMethodology = selectedTopic === "설계 방법론";
        const topicKey = isDesignMethodology 
          ? DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex] 
          : selectedTopic!;
        
        setUserSelection('TIME_UP');
        updateStatistics(topicKey, false);
        const newIncorrectAnswers = new Map(incorrectAnswers);
        newIncorrectAnswers.set(topicKey, {
          topic: topicKey,
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
  }, [timeLeft, userSelection, timerActive, quiz, selectedTopic, currentMethodologyQuizIndex, incorrectSelections, quizModeSettings.hasTimer, incorrectAnswers, updateStatistics]);

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
    const isDesignMethodology = selectedTopic === "설계 방법론";
    const topicKey = isDesignMethodology 
      ? DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex] 
      : selectedTopic!;
    
    const newIncorrectAnswers = new Map(incorrectAnswers);
    const incorrectAnswer = newIncorrectAnswers.get(topicKey) as IncorrectAnswer | undefined;
    if (incorrectAnswer) {
      const updatedAnswer: IncorrectAnswer = {
        topic: incorrectAnswer.topic,
        incorrectOption: incorrectAnswer.incorrectOption,
        isRetrying: true
      };
      newIncorrectAnswers.set(topicKey, updatedAnswer);
      setIncorrectAnswers(newIncorrectAnswers);
    }
    
    // 퀴즈 상태 초기화
    setUserSelection(null);
    setIncorrectSelections([]);
    setPersonalizedExplanation(null);
    setTimerActive(true);
    setTimeLeft(quizModeSettings.hasTimer ? QUIZ_DURATION : Infinity);
    setError(null);
  }, [selectedTopic, incorrectAnswers, quizModeSettings.hasTimer, currentMethodologyQuizIndex]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      
      {/* 배지 획득 알림 */}
      {showBadgeNotification && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <span className="text-4xl">{showBadgeNotification.icon}</span>
            <div>
              <p className="font-bold text-lg">새 배지 획득!</p>
              <p className="text-sm">{showBadgeNotification.name}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 레벨업 알림 */}
      {showLevelUp && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <span className="text-4xl">🎉</span>
            <div>
              <p className="font-bold text-lg">레벨 업!</p>
              <p className="text-sm">레벨 {gamification.level}에 도달했습니다!</p>
            </div>
          </div>
        </div>
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
          gamification={gamification}
          unlockedTopics={unlockedTopics}
          viewedContent={viewedContent}
          passedExams={passedExams}
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
          <h1 className="text-lg font-bold text-[#d83968] ml-2">Liink Challengers</h1>
        </header>
        <QuizArea
          selectedTopic={isDesignMethodology ? `설계 방법론 (${currentMethodologyQuizIndex + 1}/${DESIGN_METHODOLOGY_QUIZZES.length})` : selectedTopic}
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
          isFirstQuestion={isDesignMethodology ? currentMethodologyQuizIndex === 0 : currentTopicIndex === 0}
          isLastQuestion={isDesignMethodology ? currentMethodologyQuizIndex === DESIGN_METHODOLOGY_QUIZZES.length - 1 : currentTopicIndex === TOPICS.length - 1}
          hasIncorrectAnswer={isDesignMethodology ? incorrectAnswers.has(DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex]) && !incorrectAnswers.get(DESIGN_METHODOLOGY_QUIZZES[currentMethodologyQuizIndex])?.isRetrying : incorrectAnswers.has(selectedTopic!) && !incorrectAnswers.get(selectedTopic!)?.isRetrying}
          onRetryQuiz={handleRetryQuiz}
          personalizedExplanation={personalizedExplanation}
          isGeneratingExplanation={isGeneratingExplanation}
          currentQuestionNumber={isDesignMethodology ? currentMethodologyQuizIndex + 1 : currentTopicIndex + 1}
          totalQuestions={isDesignMethodology ? DESIGN_METHODOLOGY_QUIZZES.length : topicsWithQuizzes.length}
          hasTimer={quizModeSettings.hasTimer}
          showContent={quizModeSettings.showContent}
          quizMode={quizMode}
          viewedContent={viewedContent}
          onContentViewed={handleContentViewed}
          gamification={gamification}
          passedExams={passedExams}
        />
      </main>
    </div>
  );
}
