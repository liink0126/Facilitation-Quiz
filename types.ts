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
