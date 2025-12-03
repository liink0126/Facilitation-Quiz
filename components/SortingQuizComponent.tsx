import React, { useState, useEffect, useRef } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, ArrowRightIcon } from './icons';
import type { SortingQuiz, SortingQuizItem } from '../types';

interface SortingQuizProps {
  quiz: SortingQuiz;
  onOptionSelect?: (result: string) => void; // 완료 시 호출될 콜백
}

export const SortingQuizComponent: React.FC<SortingQuizProps> = ({ quiz, onOptionSelect }) => {
  // 상태 관리
  const [shuffledItems, setShuffledItems] = useState<SortingQuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<string, SortingQuizItem[]>>({});
  const [cardTimer, setCardTimer] = useState(5); 
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isTimeoutAnimating, setIsTimeoutAnimating] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasMadeFirstAttempt, setHasMadeFirstAttempt] = useState(false);
  const [missedItems, setMissedItems] = useState<SortingQuizItem[]>([]);
  const [hasCompleted, setHasCompleted] = useState(false);
  const CARD_TIME_LIMIT = 5;
  const dragItem = useRef<SortingQuizItem | null>(null);

  // 초기화 로직
  useEffect(() => {
    const shuffled = [...quiz.items].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
    setCurrentIndex(0);
    setCardTimer(CARD_TIME_LIMIT);
    setMissedItems([]);
    setIsGameStarted(false);
    setIsTimeoutAnimating(false);
    setHasCompleted(false);
    
    const initialPlacements: Record<string, SortingQuizItem[]> = {};
    quiz.categories.forEach(cat => {
      initialPlacements[cat] = [];
    });
    setPlacements(initialPlacements);
    setHasMadeFirstAttempt(false);
    setIsModalOpen(false);
  }, [quiz]);

  // 타이머 로직
  useEffect(() => {
    if (hasCompleted || !isGameStarted || currentIndex >= shuffledItems.length || isTimeoutAnimating) return;
    const timer = setInterval(() => {
      setCardTimer((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          handleTimeoutSequence();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [currentIndex, hasCompleted, shuffledItems.length, isGameStarted, isTimeoutAnimating]);

  const handleTimeoutSequence = () => {
    setIsTimeoutAnimating(true);
    setTimeout(() => {
        handleCardTimeout();
        setIsTimeoutAnimating(false);
    }, 700);
  };

  const handleCardTimeout = () => {
    const item = shuffledItems[currentIndex];
    setMissedItems(prev => [...prev, item]);
    setCardTimer(CARD_TIME_LIMIT);
    setCurrentIndex(prev => prev + 1);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: SortingQuizItem) => {
    if (hasCompleted || isTimeoutAnimating) return;
    dragItem.current = item;
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (targetCategory: string) => {
    if (hasCompleted || !dragItem.current || isTimeoutAnimating) return;
    
    const item = dragItem.current;
    
    setPlacements(prev => ({
      ...prev,
      [targetCategory]: [...prev[targetCategory], item]
    }));
    dragItem.current = null;
    setCardTimer(CARD_TIME_LIMIT);
    setCurrentIndex(prev => prev + 1);
  };

  const handleCheckAnswer = () => {
    const isAllCorrect = 
      missedItems.length === 0 &&
      Object.entries(placements).every(([category, items]) => {
        return (items as SortingQuizItem[]).every(item => item.category === category);
      });
    if (isAllCorrect) {
      setHasCompleted(true);
      if(onOptionSelect) onOptionSelect("COMPLETE");
    } else {
      setHasMadeFirstAttempt(true);
      setIsModalOpen(true);
    }
  };
  
  const handleFinalAttempt = () => {
    setHasCompleted(true);
    if(onOptionSelect) onOptionSelect("COMPLETE");
  };

  const handleRetryMissed = () => {
    setShuffledItems([...missedItems]);
    setMissedItems([]);
    setCurrentIndex(0);
    setCardTimer(CARD_TIME_LIMIT);
    setIsModalOpen(false);
    setIsTimeoutAnimating(false);
    setIsGameStarted(true);
  };

  const isGameFinished = currentIndex >= shuffledItems.length;
  const currentItem = shuffledItems[currentIndex];
  const isDraggable = !hasCompleted && !isGameFinished && isGameStarted && !isTimeoutAnimating;
  const isUrgent = cardTimer <= 2.0 && cardTimer > 0 && !isTimeoutAnimating;

  const getTimerColor = () => {
    if (isTimeoutAnimating || cardTimer <= 0) return 'bg-rose-500';
    if (cardTimer > 3) return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
    if (cardTimer > 1.5) return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
    return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse';
  };

  return (
    <div className="relative w-full h-[600px] bg-slate-50 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans select-none">
      {/* 게임 시작 오버레이 */}
      {!isGameStarted && !hasCompleted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/40 backdrop-blur-md">
          <div className="bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 max-w-md text-center animate-fade-in">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">사실과 평가 구분하기</h3>
            <div className="text-slate-600 mb-8 space-y-2 text-sm">
                <p>한 문제당 풀 수 있는 시간은 <strong>5초</strong>입니다.</p>
                <p>시간 안에 풀지 못한 카드는<br/><strong>'미해결 영역'</strong>에 저장됩니다.</p>
            </div>
            <button 
              onClick={() => setIsGameStarted(true)}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg rounded-xl shadow-lg transition-transform hover:-translate-y-1"
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      {/* 메인 게임 영역 */}
      <div className="flex-1 flex relative">
        {/* 왼쪽 영역: FACT */}
        <div 
           className="w-1/2 bg-sky-50 border-r border-sky-100 flex flex-col"
           onDrop={() => handleDrop(quiz.categories[0])}
           onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        >
           <div className="p-6 text-center">
             <h2 className="text-2xl font-black text-sky-200/50 uppercase tracking-widest">FACT</h2>
             <p className="text-sky-600 font-bold mt-2">사실</p>
           </div>
           <div className="flex-1 p-6 flex flex-wrap content-start gap-3 overflow-y-auto">
             {placements[quiz.categories[0]]?.map(item => (
                 <ResultItem key={item.id} item={item} category={quiz.categories[0]} showResult={hasCompleted || hasMadeFirstAttempt} />
             ))}
           </div>
        </div>

        {/* 오른쪽 영역: OPINION */}
        <div 
           className="w-1/2 bg-orange-50 border-l border-orange-100 flex flex-col"
           onDrop={() => handleDrop(quiz.categories[1])}
           onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        >
           <div className="p-6 text-center">
             <h2 className="text-2xl font-black text-orange-200/50 uppercase tracking-widest">OPINION</h2>
             <p className="text-orange-600 font-bold mt-2">평가</p>
           </div>
           <div className="flex-1 p-6 flex flex-wrap content-start gap-3 overflow-y-auto">
             {placements[quiz.categories[1]]?.map(item => (
                 <ResultItem key={item.id} item={item} category={quiz.categories[1]} showResult={hasCompleted || hasMadeFirstAttempt} />
             ))}
           </div>
        </div>

        {/* 중앙 플로팅 카드 & 타이머 */}
        {!isGameFinished && isGameStarted && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] z-10 flex flex-col items-center gap-6 pointer-events-none">
                <div 
                    key={currentItem?.id}
                    draggable={isDraggable}
                    onDragStart={(e) => currentItem && handleDragStart(e, currentItem)}
                    className={`w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-10 text-center pointer-events-auto border relative overflow-hidden bg-white
                        ${isTimeoutAnimating 
                            ? 'translate-y-[280px] scale-50 opacity-0 bg-slate-200 border-slate-300 text-slate-400 rotate-12 transition-all duration-700 ease-in-out' 
                            : `transition-transform animate-fade-in hover:scale-105 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isUrgent ? 'animate-shake border-rose-300 ring-2 ring-rose-100' : 'border-slate-100'}`
                        }
                    `}
                >
                    <p className="text-2xl font-bold break-keep relative z-10">{currentItem?.text}</p>
                     {isTimeoutAnimating && (
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                            <XCircleIcon className="w-24 h-24 text-rose-500/20" />
                        </div>
                    )}
                </div>
                <div className="w-full relative">
                    {isUrgent && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-rose-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg animate-bounce whitespace-nowrap z-20 border border-rose-400">
                             ⏳ 2초 남았어요! 서둘러주세요!
                        </div>
                    )}
                    <div className="h-3 bg-slate-200/50 backdrop-blur rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full transition-all duration-100 ease-linear rounded-full ${getTimerColor()}`}
                            style={{ width: `${(cardTimer / CARD_TIME_LIMIT) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* 완료 상태 메시지 */}
        {isGameFinished && !hasCompleted && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                 <div className="bg-white/80 backdrop-blur p-8 rounded-2xl shadow-xl animate-fade-in pointer-events-auto">
                    <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">분류 완료!</h3>
                    <p className="text-slate-500 mb-6">결과를 확인하세요.</p>
                    <button
                        onClick={!hasMadeFirstAttempt ? handleCheckAnswer : handleFinalAttempt}
                        className={`px-8 py-3 text-white font-bold rounded-lg shadow transition-transform hover:scale-105 ${!hasMadeFirstAttempt ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {!hasMadeFirstAttempt ? '정답 확인' : '최종 완료'}
                    </button>
                 </div>
            </div>
        )}
      </div>

      {/* 하단 바 (미해결 카드 및 버튼) */}
      <div className="h-20 bg-white border-t border-slate-100 px-8 flex justify-between items-center z-20">
         <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300 ${missedItems.length > 0 ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
            <ExclamationCircleIcon className={`w-5 h-5 ${missedItems.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            <span className="text-sm font-semibold text-slate-600">미해결 카드</span>
            <span className={`text-sm font-bold ${missedItems.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {missedItems.length}
            </span>
         </div>
         {isGameFinished && (
             <button 
                onClick={!hasMadeFirstAttempt ? handleCheckAnswer : handleFinalAttempt}
                className="flex items-center gap-2 text-slate-900 font-bold hover:text-blue-600 transition-colors"
            >
                <span>결과 확인</span>
                <ArrowRightIcon className="w-5 h-5" />
            </button>
         )}
      </div>

      {/* 결과 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transform scale-100" onClick={(e) => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${missedItems.length > 0 ? 'bg-rose-100' : 'bg-amber-100'}`}>
                <ExclamationCircleIcon className={`w-8 h-8 ${missedItems.length > 0 ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
                {missedItems.length > 0 ? '미해결 카드가 있습니다' : '결과 확인'}
            </h3>
            {missedItems.length > 0 ? (
                <>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        시간 내에 풀지 못한 카드가 <span className="text-rose-600 font-bold">{missedItems.length}장</span> 있습니다.<br/>다시 도전해보시겠습니까?
                    </p>
                    <button
                        onClick={handleRetryMissed}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow hover:bg-slate-800 transition-transform active:scale-95"
                    >
                        아쉽지만 다시 한번 풀어보겠습니다
                    </button>
                </>
            ) : (
                <>
                     <p className="text-slate-600 text-sm mb-8 leading-relaxed">
                        <span className="text-rose-500 font-bold">오분류</span>된 카드가 있습니다.<br/>다시 확인해보시겠습니까?
                    </p>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow hover:bg-slate-800 transition-transform active:scale-95"
                    >
                        확인
                    </button>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 결과 아이템 헬퍼 컴포넌트
const ResultItem: React.FC<{ item: SortingQuizItem, category: string, showResult: boolean }> = ({ item, category, showResult }) => {
    let itemStyle = 'bg-white border-slate-100 text-slate-600';
    let icon = null;
    if (showResult) {
        const isCorrect = item.category === category;
        if (isCorrect) {
            itemStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm';
            icon = <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
        } else {
            itemStyle = 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm';
            icon = <XCircleIcon className="w-4 h-4 text-rose-500 flex-shrink-0" />;
        }
    }
    return (
        <div className={`px-4 py-3 rounded-xl border text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-2 animate-fade-in ${itemStyle}`}>
            <span className="break-keep">{item.text}</span>
            {icon}
        </div>
    );
};

