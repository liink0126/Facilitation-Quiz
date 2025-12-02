export type QuizType = 'multiple-choice' | 'matching';

export interface Quiz {
  type: QuizType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface MatchingQuiz extends Quiz {
  type: 'matching';
  items: Array<{
  term: string;
  definition: string;
  }>;
}

export interface QuizProgress {
  answeredTopics: string[];
  incorrectAnswers: Array<{ topic: string; incorrectOption: string; isRetrying: boolean }>;
  currentTopicIndex: number;
  quizMode: 'practice' | 'exam' | 'review';
  statistics: {
    totalAnswered: number;
    totalCorrect: number;
    totalIncorrect: number;
    averageTime: number;
    topicStats: Record<string, { correct: number; incorrect: number; timeSpent: number }>;
  };
}

export interface QuizMode {
  type: 'practice' | 'exam' | 'review';
  hasTimer: boolean;
  allowRetry: boolean;
  showExplanation: boolean;
}

// 게이미피케이션 요소
export interface Gamification {
  points: number;
  level: number;
  badges: string[];
  streak: number; // 연속 학습일
  lastStudyDate: string;
  completedTopicsCount: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (gamification: Gamification) => boolean;
}
