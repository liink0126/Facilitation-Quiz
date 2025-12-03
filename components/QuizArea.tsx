import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Quiz, MatchingQuiz, Gamification } from '../types';
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon, ClockIcon, ArrowLeftIcon } from './icons';

const MatchingQuizComponent: React.FC<{
  quiz: MatchingQuiz;
  onOptionSelect: (option: string) => void;
  hasAnswered: boolean;
}> = ({ quiz, onOptionSelect, hasAnswered }) => {
  const [shuffledDefs, setShuffledDefs] = useState<string[]>([]);
  const [selections, setSelections] = useState<Map<string, string>>(new Map());

  const defToTermMap = useMemo(() => {
    const map = new Map<string, string>();
    quiz.items.forEach(item => map.set(item.definition, item.term));
    return map;
  }, [quiz.items]);

  const choices = useMemo(() => quiz.items.map(i => i.term), [quiz.items]);

  useEffect(() => {
    const definitions = quiz.items.map(i => i.definition);
    for (let i = definitions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [definitions[i], definitions[j]] = [definitions[j], definitions[i]];
    }
    setShuffledDefs(definitions);
    setSelections(new Map());
  }, [quiz]);

  const handleSelectionChange = (definition: string, term: string) => {
    const newSelections = new Map(selections);
    if (term) {
      newSelections.set(definition, term);
    } else {
      newSelections.delete(definition);
    }
    setSelections(newSelections);
  };
  
  const handleSubmit = () => {
    if (!hasAnswered) {
      onOptionSelect("MATCHING_COMPLETE");
    }
  };

  const allAnswered = selections.size === quiz.items.length;
  const usedChoices = new Set(selections.values());

  return (
    <div className="mt-12">
      <div className="bg-slate-50 p-6 sm:p-8 rounded-lg mb-6">
        <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-8 whitespace-pre-line">{quiz.question}</p>
      </div>
      
      <div className="space-y-4">
        {shuffledDefs.map((definition, index) => {
          const selectedTerm = selections.get(definition) || '';
          const correctTerm = defToTermMap.get(definition)!;
          const isCorrect = selectedTerm === correctTerm;

          let containerStyle = 'bg-white';
          let resultIcon = null;

          if (hasAnswered) {
            if (isCorrect) {
              containerStyle = 'bg-emerald-50 border-emerald-300';
              resultIcon = <CheckCircleIcon className="w-6 h-6 text-emerald-600" />;
            } else {
              containerStyle = 'bg-rose-50 border-rose-300';
              resultIcon = <XCircleIcon className="w-6 h-6 text-rose-600" />;
            }
          }

          return (
            <div key={definition} className={`p-5 sm:p-6 border rounded-lg transition-colors ${containerStyle}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <p className="flex-1 text-base sm:text-lg text-slate-800 mb-3 sm:mb-0 leading-7">
                  <span className="font-bold mr-2">{index + 1}.</span>
                  {definition}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTerm}
                    onChange={(e) => handleSelectionChange(definition, e.target.value)}
                    disabled={hasAnswered}
                    className={`block w-full sm:w-60 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${selectedTerm && !hasAnswered ? 'font-bold text-blue-600' : ''}`}
                    aria-label={`Select a voting method for: ${definition}`}
                  >
                    <option value="" disabled>투표 방식 선택</option>
                    {choices.map(choice => {
                      const isUsedElsewhere = usedChoices.has(choice) && choice !== selectedTerm;
                      return (
                        <option key={choice} value={choice} disabled={isUsedElsewhere}>
                          {choice}
                        </option>
                      );
                    })}
                  </select>
                  {resultIcon && <div className="flex-shrink-0">{resultIcon}</div>}
                </div>
              </div>
              {hasAnswered && !isCorrect && (
                <div className="mt-3 text-sm text-rose-700 font-semibold animate-fade-in pl-6 sm:pl-0 sm:text-right">
                  정답: {correctTerm}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allAnswered && !hasAnswered && (
        <div className="mt-8 flex justify-center animate-fade-in">
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-transform duration-150 ease-in-out hover:scale-105"
          >
            정답 확인
          </button>
        </div>
      )}
    </div>
  );
};

interface QuizAreaProps {
  selectedTopic: string | null;
  topicContent: string | null;
  quiz: Quiz | null;
  userSelection: string | null;
  incorrectSelections: string[];
  error: string | null;
  onOptionSelect: (option: string) => void;
  onNextQuiz: () => void;
  onPreviousQuestion: () => void;
  isQuizComplete: boolean;
  timeLeft: number;
  quizDuration: number;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  hasIncorrectAnswer?: boolean;
  onRetryQuiz?: () => void;
  personalizedExplanation?: string | null;
  isGeneratingExplanation?: boolean;
  currentQuestionNumber?: number;
  totalQuestions?: number;
  hasTimer?: boolean;
  showContent?: boolean;
  quizMode?: 'learning' | 'exam' | 'review';
  viewedContent?: Set<string>;
  onContentViewed?: (topic: string) => void;
  gamification?: Gamification;
}

const QuizArea: React.FC<QuizAreaProps> = ({
  selectedTopic,
  topicContent,
  quiz,
  userSelection,
  incorrectSelections,
  error,
  onOptionSelect,
  onNextQuiz,
  onPreviousQuestion,
  isQuizComplete,
  timeLeft,
  quizDuration,
  isFirstQuestion,
  isLastQuestion,
  hasIncorrectAnswer = false,
  onRetryQuiz,
  personalizedExplanation,
  isGeneratingExplanation = false,
  currentQuestionNumber = 0,
  totalQuestions = 0,
  hasTimer = true,
  showContent = false,
  quizMode = 'learning',
  viewedContent = new Set(),
  onContentViewed,
  gamification,
}) => {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // 학습 모드에서 학습 내용 보기
  const topicName = selectedTopic?.replace(/ \(\d+\/\d+\)$/, '') || ''; // "설계 방법론 (1/4)" -> "설계 방법론"
  const hasViewedContent = viewedContent.has(topicName);
  
  // 학습 모드일 때는 학습 내용을 먼저 보고, 확인 버튼을 누르면 퀴즈로 이동
  if (quizMode === 'learning' && topicContent && !hasViewedContent) {
    const handleContentComplete = () => {
      console.log('학습 완료 버튼 클릭!', topicName);
      if (onContentViewed) {
        onContentViewed(topicName);
        console.log('onContentViewed 호출 완료');
      } else {
        console.error('onContentViewed가 정의되지 않았습니다!');
      }
    };
    
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        {selectedTopic && (
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 mb-8">
            {selectedTopic}
          </h2>
        )}
        <div 
          className="content-area prose prose-slate max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: topicContent }}
        />
        <div className="flex justify-center mt-8 mb-12">
          <button
            type="button"
            onClick={handleContentComplete}
            className="px-8 py-4 bg-gradient-to-r from-[#d83968] to-pink-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer relative z-10"
          >
            학습 완료! 퀴즈 풀러 가기 →
          </button>
        </div>
        <div className="text-center text-slate-500 text-sm mb-8">
          ⬆️ 위 버튼을 클릭하여 퀴즈로 넘어가세요
        </div>
      </div>
    );
  }
  
  // 일반 학습 모드 (showContent가 true일 때)
  if (showContent && topicContent) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        {selectedTopic && (
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 mb-8">
            {selectedTopic}
          </h2>
        )}
        <div 
          className="content-area prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: topicContent }}
        />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        {selectedTopic && <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800">{selectedTopic}</h2>}
        <div className="mt-8 p-6 bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500 rounded-xl shadow-sm" role="alert" aria-live="polite">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold text-lg mb-1">알림</h3>
          <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedTopic) {
     return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <AcademicCapIcon className="mx-auto h-16 w-16 text-pink-300" />
          <h2 className="mt-6 text-3xl font-bold text-slate-800">주제를 선택해주세요.</h2>
          <p className="mt-4 text-lg text-slate-600">왼쪽 메뉴에서 학습할 주제를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  const hasAnswered = userSelection !== null;
  const hasQuiz = quiz && quiz.question;

  if (isQuizComplete) {
    return (
       <div className="flex items-center justify-center h-full">
        <div className="text-center p-10 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 rounded-2xl shadow-2xl max-w-2xl animate-fade-in-up">
          <div className="text-6xl mb-6 animate-bounce">🎉</div>
          <CheckCircleIcon className="mx-auto h-20 w-20 text-emerald-500 mb-4" />
          <h2 className="mt-4 text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            축하합니다!
          </h2>
          <h3 className="mt-2 text-2xl font-bold text-slate-800">
            모든 학습을 완료했습니다! 🏆
          </h3>
          <p className="mt-6 text-lg text-slate-700 leading-relaxed">
            정말 수고하셨습니다!<br/>
            모든 퍼실리테이션 기법을 마스터하셨네요.
          </p>
          
          {gamification && (
            <div className="mt-8 p-6 bg-white rounded-xl shadow-md">
              <h4 className="text-lg font-bold text-slate-700 mb-4">최종 성적</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-3xl font-bold text-purple-600">{gamification.level}</p>
                  <p className="text-sm text-slate-500">레벨</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-pink-600">{gamification.points}</p>
                  <p className="text-sm text-slate-500">포인트</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-yellow-600">{gamification.badges.length}</p>
                  <p className="text-sm text-slate-500">배지</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-300">
            <p className="text-2xl mb-2">🎁</p>
            <p className="text-lg font-bold text-slate-800">특별한 보상이 기다리고 있어요!</p>
            <p className="text-sm text-slate-600 mt-2">운영진에게 완료 화면을 보여주세요 😊</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">{selectedTopic}</h2>
        {totalQuestions > 0 && (
          <div className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            문제 {currentQuestionNumber} / {totalQuestions}
          </div>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-md">
        {hasQuiz && quiz.type === 'matching' && (
           <MatchingQuizComponent quiz={quiz as MatchingQuiz} onOptionSelect={onOptionSelect} hasAnswered={hasAnswered} />
        )}

        {hasQuiz && quiz.type === 'multiple-choice' && (
          <div className="space-y-6">
            {hasTimer && (
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ClockIcon className="w-5 h-5 text-pink-600" />
                  남은 시간
                </span>
                  <span className="text-lg font-bold text-pink-700">{timeLeft}초</span>
              </div>
                <div className="w-full bg-white/60 rounded-full h-3 shadow-inner">
                <div 
                    className={`h-3 rounded-full transition-all duration-500 ease-linear ${
                      timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 20 ? 'bg-orange-500' : 'bg-pink-500'
                    }`}
                  style={{ width: `${(timeLeft / quizDuration) * 100}%` }}
                ></div>
              </div>
            </div>
            )}

            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-5 sm:p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up">
              <p className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 leading-relaxed whitespace-pre-line" role="article" aria-label="퀴즈 문제">{quiz.question}</p>
            </div>
             
            {userSelection === 'TIME_UP' && (
              <div className="mt-4 text-center p-3 bg-rose-50 text-rose-700 font-bold rounded-lg animate-fade-in">
                  시간 초과!
              </div>
            )}
             
            {incorrectSelections.includes('TIME_UP') && !userSelection && (
              <div className="mt-4 text-center p-3 bg-rose-50 text-rose-700 font-bold rounded-lg animate-fade-in">
                  시간 초과! 오답으로 처리됩니다. 답을 선택해주세요.
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {quiz.options.map((option, index) => {
                const isSelected = userSelection === option;
                const isCorrect = quiz.correctAnswer === option;
                const isIncorrectAttempt = incorrectSelections.includes(option);
                
                // 틀렸을 때는 정답을 표시하지 않고 계속 선택 가능하게 함
                // 정답을 맞췄을 때만 정답 표시 및 비활성화
                const isCorrectAnswer = hasAnswered && isCorrect && !hasIncorrectAnswer;
                let isDisabled = false;
                
                // 정답을 맞췄을 때만 비활성화
                if (isCorrectAnswer) {
                  isDisabled = true;
                }

                let buttonStyle = 'bg-white border-slate-200 hover:border-[#d83968] hover:bg-pink-50';
                let iconStyle = 'bg-slate-200 text-slate-600';
                let showCorrectIcon = false;
                let showIncorrectIcon = false;

                // 정답을 맞췄을 때만 정답 표시
                if (isCorrectAnswer) {
                    buttonStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold animate-celebrate';
                    iconStyle = 'bg-emerald-200 text-emerald-800';
                    showCorrectIcon = true;
                } else if (hasIncorrectAnswer) {
                  // 틀렸을 때는 선택한 답만 표시하고, 정답은 표시하지 않음
                  // 계속 선택 가능하도록 함
                  if (isSelected) {
                    buttonStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
                    iconStyle = 'bg-rose-200 text-rose-800';
                    showIncorrectIcon = true;
                  } else {
                    // 틀렸을 때는 다른 선택지는 그대로 유지 (정답 표시 안 함)
                    buttonStyle = 'bg-white border-slate-200 hover:border-[#d83968] hover:bg-pink-50';
                  }
                } else if (isIncorrectAttempt && !hasIncorrectAnswer) {
                  // 오답 시도 중일 때 (아직 2번 안 틀림)
                  buttonStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
                  iconStyle = 'bg-rose-200 text-rose-800';
                  showIncorrectIcon = true;
                  isDisabled = true; // 오답 시도한 선택지는 비활성화
                }

                return (
                  <button
                    key={index}
                    ref={(el) => { optionRefs.current[index] = el; }}
                    onClick={() => onOptionSelect(option)}
                    disabled={isDisabled}
                    className={`w-full text-left p-4 sm:p-5 border-2 rounded-xl flex items-center gap-3 sm:gap-4 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${buttonStyle} ${!isDisabled ? 'cursor-pointer active:scale-[0.98]' : 'cursor-not-allowed'}`}
                    aria-label={`선택지 ${index + 1}: ${option}`}
                    aria-pressed={isSelected}
                    tabIndex={isDisabled ? -1 : 0}
                  >
                    <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg ${iconStyle}`}>
                      {index + 1}
                    </div>
                    <span className="flex-1 text-sm sm:text-base md:text-lg leading-relaxed font-medium">{option}</span>
                    {showCorrectIcon && <CheckCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 flex-shrink-0" />}
                    {showIncorrectIcon && <XCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-rose-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 틀렸을 때 안내 메시지 (정답을 맞추기 전) */}
        {hasIncorrectAnswer && onRetryQuiz && !personalizedExplanation && (
          <div className="mt-6 animate-shake">
            <div className="p-5 sm:p-6 rounded-xl bg-amber-50 border-l-4 border-amber-400 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-amber-900 mb-2">다시 풀어보세요!</h4>
                  <p className="text-base text-amber-800 mb-4 leading-7">
                    이 문제를 틀리셨네요. 학습 내용을 다시 확인하고 한 번 더 도전해보세요. 정답을 맞추시면 틀렸던 부분을 바탕으로 맞춤형 해설을 제공해드립니다.
                  </p>
                  <button
                    onClick={onRetryQuiz}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-transform duration-150 ease-in-out hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    다시 풀기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 정답을 맞췄을 때 축하 메시지 */}
        {hasAnswered && quiz?.question && !hasIncorrectAnswer && userSelection !== 'TIME_UP' && (
          <div className="mt-6 animate-fade-in">
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-100 to-green-100 border-2 border-emerald-400 shadow-lg flex items-center gap-3">
              <span className="text-4xl animate-bounce">🎉</span>
              <div>
                <p className="text-lg font-bold text-emerald-800">정답입니다!</p>
                <p className="text-sm text-emerald-700">
                  {incorrectSelections.length === 0 ? '완벽해요! +10 보너스 포인트' : '잘하셨어요!'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 정답을 맞췄을 때만 해설 표시 */}
        {hasAnswered && quiz?.question && !hasIncorrectAnswer && (
          <div className="mt-6 animate-fade-in space-y-4">
            <div className="p-5 sm:p-6 md:p-8 rounded-xl bg-blue-50 border-l-4 border-blue-400 shadow-sm">
              <h3 className="text-xl font-bold text-blue-900 mt-0 mb-4">
                {personalizedExplanation ? '맞춤형 해설' : '해설'}
              </h3>
              
              {isGeneratingExplanation ? (
                <div className="flex items-center gap-3 text-blue-700">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-base">맞춤형 해설을 생성하고 있습니다...</span>
                </div>
              ) : personalizedExplanation ? (
                <div className="explanation-area text-base sm:text-lg text-blue-800 whitespace-pre-line leading-8">
                  {personalizedExplanation}
                </div>
              ) : (
                <div
                  className="explanation-area text-base sm:text-lg text-blue-800"
                  dangerouslySetInnerHTML={{ __html: quiz.explanation }}
                />
              )}
            </div>
          </div>
        )}

        {/* 틀렸던 문제를 다시 맞췄을 때 맞춤형 해설 표시 */}
        {hasAnswered && quiz?.question && hasIncorrectAnswer && personalizedExplanation && (
          <div className="mt-6 animate-fade-in space-y-4">
            <div className="p-5 sm:p-6 md:p-8 rounded-xl bg-blue-50 border-l-4 border-blue-400 shadow-sm">
              <h3 className="text-xl font-bold text-blue-900 mt-0 mb-4">맞춤형 해설</h3>
              
              {isGeneratingExplanation ? (
                <div className="flex items-center gap-3 text-blue-700">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-base">맞춤형 해설을 생성하고 있습니다...</span>
                </div>
              ) : (
                <div className="explanation-area text-base sm:text-lg text-blue-800 whitespace-pre-line leading-8">
                  {personalizedExplanation}
                </div>
              )}
            </div>
          </div>
        )}
          
        {!isQuizComplete && (
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={onPreviousQuestion}
              disabled={isFirstQuestion}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-transform duration-150 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ArrowLeftIcon />
              이전 문제 보기
            </button>
            <button
              onClick={onNextQuiz}
              disabled={isLastQuestion}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#d83968] text-white font-semibold rounded-lg shadow-md hover:bg-[#c2325c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d83968] transition-transform duration-150 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              다음 문제 풀기
              <ArrowRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizArea;