import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Clock, CheckCircle, XCircle, Home, Trophy, Brain, ChevronLeft, ChevronRight, AlertTriangle, Shield, Menu, Flag, Save, CheckSquare, Eye } from 'lucide-react';
import { QuestionService } from '../../services/questionService';
import MathText from '../common/MathText';
import { formatExponents } from '../../utils/mathFormatting';
import { ExamResultService } from '../../services/examResultService';
import { ExamSessionService } from '../../services/examSessionService';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

// Internal question format for SecureExamInterface
interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: number;  // V2: Always numeric index
  explanation?: string;
  difficulty: string;
  subject: 'ANG' | 'CG' | 'LOG';  // V2: Renamed from category
  exam_type?: string;
}

interface SecureExamInterfaceProps {
  onExit: () => void;
}

export const SecureExamInterface: React.FC<SecureExamInterfaceProps> = ({ onExit }) => {
  const { user, profile, selectedExamType } = useSupabaseAuth();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Map<string, string | number>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(180 * 60); // 3 hours in seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionStartTimes, setQuestionStartTimes] = useState<Map<number, number>>(new Map());
  const examStartTime = useRef<Date>(new Date());
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Security: Detect tab switching and window focus
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       setTabSwitchCount(prev => prev + 1);
  //       setWarningDismissed(false); // Reset warning dismissed state on new tab switch
  //       if (tabSwitchCount >= 2) {
  //         handleFinishExam();
  //       }
  //     }
  //   };
  //
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     e.preventDefault();
  //     e.returnValue = 'Êtes-vous sûr de vouloir quitter l\'examen ? Votre examen sera terminé automatiquement.';
  //     return 'Êtes-vous sûr de vouloir quitter l\'examen ? Votre examen sera terminé automatiquement.';
  //   };
  //
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [tabSwitchCount]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || isLoading) return;

      // Prevent default for exam-specific keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'j', 'k'].includes(e.key)) {
        e.preventDefault();
      }

      // Answer selection with arrow keys or J/K
      if (['ArrowUp', 'ArrowDown', 'j', 'k'].includes(e.key)) {
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return;

        const options = currentQuestion.type === 'multiple-choice' 
          ? currentQuestion.options || []
          : ['Vrai', 'Faux'];

        const currentIndex = selectedAnswer !== null 
          ? (typeof selectedAnswer === 'number' ? selectedAnswer : (selectedAnswer === 'true' ? 0 : 1))
          : -1;

        let newIndex = currentIndex;
        if (e.key === 'ArrowUp' || e.key === 'k') {
          newIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
          newIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1;
        }

        const answerValue = currentQuestion.type === 'multiple-choice' ? newIndex : (newIndex === 0 ? 'true' : 'false');
        handleAnswerSelect(answerValue);
      }

      // Navigation with left/right arrows
      if (e.key === 'ArrowLeft') {
        handlePreviousQuestion();
      } else if (e.key === 'ArrowRight') {
        handleNextQuestion();
      }

      // Select answer with Enter
      if (e.key === 'Enter' && selectedAnswer !== null) {
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, selectedAnswer, questions, isCompleted, isLoading]);

  // Load exam questions in specific order: 20 ANG, then 20 CG, then 20 LOG
  useEffect(() => {
    const loadExamQuestions = async () => {
      setIsLoading(true);
      try {
        const allQuestions: Question[] = [];
        const subjects: ('ANG' | 'CG' | 'LOG')[] = ['ANG', 'CG', 'LOG'];
        
        for (const subject of subjects) {
          try {
            // Get user's exam type, use same logic as ExamPage for consistency
            const userExamType = selectedExamType || profile?.plan_name || 'CM';
            
            // Use the new pre-generated exam blanc questions method
            const subjectQuestions = await QuestionService.getExamBlancQuestions(
              subject, 
              examId || '1', 
              userExamType as 'CM' | 'CMS' | 'CS', 
              20
            );
            
            console.log(`🔍 Converting ${subjectQuestions.length} V2 questions for ${subject}`);
            
            // V2: Questions already have the correct structure
            const convertedQuestions = subjectQuestions.map((dbQ, index) => {
              console.log(`🔍 V2 Question ${index + 1}:`, {
                id: dbQ.id,
                text: dbQ.text,
                options: dbQ.options,
                correct_index: dbQ.correct_index,
                subject: dbQ.subject
              });
              
              // V2: Format options for display (handle math exponents)
              const formattedOptions = dbQ.options?.map(option => formatExponents(option)) || [];
              
              const convertedQuestion: Question = {
                id: dbQ.id,
                type: 'multiple-choice',  // V2: All questions are multiple choice
                question: formatExponents(dbQ.text),
                options: formattedOptions,
                correctAnswer: dbQ.correct_index,  // V2: Already numeric
                explanation: formatExponents(
                  dbQ.explanation ||
                    `La réponse correcte est ${formattedOptions[dbQ.correct_index] || ''}.`
                ),
                difficulty: dbQ.difficulty || 'MEDIUM',
                subject: dbQ.subject,  // V2: Use subject instead of category
                exam_type: dbQ.exam_type
              };
              
              console.log(`✅ Converted V2 question ${index + 1}:`, {
                id: convertedQuestion.id,
                question: convertedQuestion.question.substring(0, 50) + '...',
                optionsCount: convertedQuestion.options?.length,
                correctAnswer: convertedQuestion.correctAnswer
              });
              
              return convertedQuestion;
            });            
            allQuestions.push(...convertedQuestions);
          } catch (error) {
            console.error(`Error loading questions for ${subject}:`, error);
          }
        }
        
        if (allQuestions.length === 0) {
          throw new Error('No questions could be loaded for the exam. Please check if questions exist in the database.');
        }
        
        setQuestions(allQuestions);
        
      } catch (error) {
        console.error('Error loading exam questions:', error);
        setError(`Failed to load exam questions: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadExamQuestions();
  }, [examId]);

  // Start exam session when questions are loaded
  useEffect(() => {
    const startExamSession = async () => {
      if (questions.length > 0 && !sessionId && !isCompleted && user) {
        const userExamType = selectedExamType || profile?.plan_name || 'CM';
        const newSessionId = await ExamSessionService.startSession({
          userId: user.id,
          testType: 'exam_blanc',
          examType: userExamType as 'CM' | 'CMS' | 'CS',
          testNumber: parseInt(examId || '1', 10),
          totalQuestions: questions.length,
        });
        setSessionId(newSessionId);
        
        // Start timing for first question
        setQuestionStartTimes(new Map([[0, Date.now()]]));
        console.log('📝 Started exam session:', newSessionId);
      }
    };
    startExamSession();
  }, [questions.length, sessionId, isCompleted, user, selectedExamType, profile?.plan_name, examId]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (isCompleted || isLoading) return;

    autoSaveInterval.current = setInterval(() => {
      console.log('Auto-saving answers...');
      showToast('Réponses sauvegardées automatiquement', 'info');
    }, 30000);

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [isCompleted, isLoading, showToast]);

  // Timer
  useEffect(() => {
    if (isCompleted || isLoading) return;

    if (timeRemaining <= 0) {
      handleFinishExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isCompleted, isLoading]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string | number) => {
    if (!questions[currentQuestionIndex]) return;
    console.log('🎯 Answer selected:', answer, 'for question:', questions[currentQuestionIndex].id);
    setSelectedAnswer(answer);
    
    setUserAnswers(prev => {
      const newMap = new Map(prev).set(questions[currentQuestionIndex].id, answer);
      console.log('📝 User answers updated:', Array.from(newMap.entries()));
      return newMap;
    });
    
    const isCorrect = (() => {
      if (questions[currentQuestionIndex].type === 'multiple-choice' && typeof questions[currentQuestionIndex].correctAnswer === 'number') {
        // Convert letter answer back to number for comparison
        const answerIndex = typeof answer === 'string' && answer.length === 1 ? answer.charCodeAt(0) - 65 : answer;
        return answerIndex === questions[currentQuestionIndex].correctAnswer;
      } else if (questions[currentQuestionIndex].type === 'true-false') {
        return String(answer).toLowerCase() === String(questions[currentQuestionIndex].correctAnswer).toLowerCase();
      }
      return answer === questions[currentQuestionIndex].correctAnswer;
    })();

    if (isCorrect && !answeredQuestions.has(questions[currentQuestionIndex].id)) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    setAnsweredQuestions(prev => new Set([...prev, questions[currentQuestionIndex].id]));
    showToast('Réponse sélectionnée', 'success');
  };

  const handleFlagQuestion = () => {
    const questionId = questions[currentQuestionIndex].id;
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
        showToast('Question non marquée', 'info');
      } else {
        newSet.add(questionId);
        showToast('Question marquée pour révision', 'info');
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    // Save current answer before moving
    if (selectedAnswer) {
      setUserAnswers(prev => new Map(prev).set(questions[currentQuestionIndex].id, selectedAnswer));
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      // Track timing for next question
      if (!questionStartTimes.has(nextIndex)) {
        setQuestionStartTimes(prev => new Map(prev).set(nextIndex, Date.now()));
      }
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log('🏁 Reached last question, finishing exam...');
      handleFinishExam();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedAnswer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishExam = async () => {
    console.log('🎯 handleFinishExam called');
    setIsCompleted(true);
    if (autoSaveInterval.current) {
      clearInterval(autoSaveInterval.current);
    }

    // Save exam result to database
    if (user) {
      console.log('💾 Saving exam result to database...');
      const correctAnswers = questions.reduce((count, q) => {
        const userAnswer = userAnswers.get(q.id);
        console.log(`🔍 Question ${q.id}: userAnswer=${userAnswer}, correctAnswer=${q.correctAnswer}`);
        
        // Convert letter answer to number for comparison with correctAnswer
        if (typeof userAnswer === 'string' && userAnswer.length === 1 && typeof q.correctAnswer === 'number') {
          const answerIndex = userAnswer.charCodeAt(0) - 65;
          const isCorrect = answerIndex === q.correctAnswer;
          console.log(`  Converted ${userAnswer} to ${answerIndex}, correct: ${isCorrect}`);
          return isCorrect ? count + 1 : count;
        }
        const isCorrect = userAnswer === q.correctAnswer;
        console.log(`  Direct comparison: ${userAnswer} === ${q.correctAnswer}, correct: ${isCorrect}`);
        return isCorrect ? count + 1 : count;
      }, 0);
      
      const overallScore = Math.round((correctAnswers / questions.length) * 100);
      console.log(`📊 Calculated score: ${overallScore}% (${correctAnswers}/${questions.length} correct)`);
      console.log(`📊 User answers collected: ${userAnswers.size}/${questions.length}`);
      console.log(`📊 User answers:`, Array.from(userAnswers.entries()).slice(0, 5)); // Show first 5 answers
      
      // Calculate subject scores
      const subjectScores = { ANG: 0, CG: 0, LOG: 0 };
      const subjectTotals = { ANG: 0, CG: 0, LOG: 0 };
      
      questions.forEach(q => {
        const userAnswer = userAnswers.get(q.id);
        // Convert letter answer to number for comparison with correctAnswer
        let isCorrect = false;
        if (typeof userAnswer === 'string' && userAnswer.length === 1 && typeof q.correctAnswer === 'number') {
          const answerIndex = userAnswer.charCodeAt(0) - 65;
          isCorrect = answerIndex === q.correctAnswer;
        } else {
          isCorrect = userAnswer === q.correctAnswer;
        }
        
        if (q.subject === 'ANG' || q.subject === 'CG' || q.subject === 'LOG') {
          subjectTotals[q.subject]++;
          if (isCorrect) {
            subjectScores[q.subject]++;
          }
        }
      });
      
      // Convert to percentages
      const subjectPercentages = {
        ANG: subjectTotals.ANG > 0 ? Math.round((subjectScores.ANG / subjectTotals.ANG) * 100) : 0,
        CG: subjectTotals.CG > 0 ? Math.round((subjectScores.CG / subjectTotals.CG) * 100) : 0,
        LOG: subjectTotals.LOG > 0 ? Math.round((subjectScores.LOG / subjectTotals.LOG) * 100) : 0
      };
      
      // Get user's exam type, use same logic as ExamPage for consistency
      const userExamType = selectedExamType || profile?.plan_name || 'CM';
      console.log(`💾 Saving to database: user=${user.id}, examType=${userExamType}, examNumber=${examId}, score=${overallScore}`);
      
      try {
        // V2: Create question snapshot in V2 format
        const questionsSnapshot = questions.map((q, index) => ({
          id: q.id,
          order: index,
          text: q.question,  // V2: 'text' instead of 'question_text'
          options: q.options || [],  // V2: options[] array
          correct_index: q.correctAnswer,  // V2: numeric index
          explanation: q.explanation ?? '',
          subject: q.subject,  // V2: 'subject' instead of 'category'
          difficulty: (q.difficulty?.toUpperCase() || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD',
          test_type: 'exam_blanc' as const
        }));

        // V2: Convert userAnswers to Map<string, number> (indices)
        const userAnswersNumeric = new Map<string, number>();
        userAnswers.forEach((value, key) => {
          // Convert letter answers to numeric index if needed
          let answerIndex: number;
          if (typeof value === 'number') {
            answerIndex = value;
          } else if (typeof value === 'string' && value.length === 1 && /[A-D]/i.test(value)) {
            answerIndex = value.toUpperCase().charCodeAt(0) - 65;
          } else {
            answerIndex = parseInt(String(value), 10) || 0;
          }
          userAnswersNumeric.set(key, answerIndex);
        });

        const saveResult = await ExamResultService.saveExamResult(
          user.id,
          userExamType as 'CM' | 'CMS' | 'CS',
          parseInt(examId || '1'),
          overallScore,
          subjectPercentages,
          userAnswersNumeric,
          questionsSnapshot
        );
        
        console.log(`💾 Save result: ${saveResult ? 'SUCCESS' : 'FAILED'}`);

        // Save to exam_sessions and exam_answers for granular tracking
        if (sessionId) {
          const examEndTime = Date.now();
          const examStart = questionStartTimes.get(0) || examEndTime;
          const totalTimeSeconds = Math.round((examEndTime - examStart) / 1000);

          // Record all answers with timing
          const answersData = questions.map((q, index) => {
            const userAnswer = userAnswers.get(q.id);
            const startTime = questionStartTimes.get(index);
            const nextStartTime = questionStartTimes.get(index + 1) || examEndTime;
            const timeSpentMs = startTime ? nextStartTime - startTime : null;
            
            // Determine selected option index
            let selectedIdx: number | null = null;
            if (userAnswer !== undefined && userAnswer !== null) {
              if (typeof userAnswer === 'number') {
                selectedIdx = userAnswer;
              } else if (typeof userAnswer === 'string' && userAnswer.length === 1 && /[A-D]/i.test(userAnswer)) {
                selectedIdx = userAnswer.toUpperCase().charCodeAt(0) - 65;
              }
            }
            
            return {
              questionId: q.id,
              selectedOptionIndex: selectedIdx,
              correctIndex: q.correctAnswer,
              timeSpentMs: timeSpentMs || undefined,
            };
          });

          await ExamSessionService.recordAnswersBatch({
            sessionId,
            answers: answersData,
          });

          // Complete the session
          await ExamSessionService.completeSession({
            sessionId,
            correctAnswers,
            totalQuestions: questions.length,
            timeSpentSeconds: totalTimeSeconds,
          });

          console.log(`📊 Exam session ${sessionId} completed with tracking`);
        }
      } catch (error) {
        console.error('❌ Error in handleFinishExam:', error);
      }
    }
  };

  const handleExit = () => {
    setShowExitWarning(true);
  };

  const confirmExit = () => {
    onExit();
  };

  // Get current subject section info
  const getCurrentSubjectInfo = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return { section: '', range: '', color: 'blue' };
    
    const angCount = questions.filter(q => q.subject === 'ANG').length;
    const cgCount = questions.filter(q => q.subject === 'CG').length;
    
    if (currentQuestionIndex < angCount) {
      return { 
        section: 'Anglais', 
        range: `Questions 1-${angCount}`,
        color: 'green'
      };
    } else if (currentQuestionIndex < angCount + cgCount) {
      return { 
        section: 'Culture Générale', 
        range: `Questions ${angCount + 1}-${angCount + cgCount}`,
        color: 'blue'
      };
    } else {
      return { 
        section: 'Logique', 
        range: `Questions ${angCount + cgCount + 1}-${questions.length}`,
        color: 'yellow'
      };
    }
  };

  // Group questions by subject for sidebar
  const getQuestionsBySubject = () => {
    const angCount = questions.filter(q => q.subject === 'ANG').length;
    const cgCount = questions.filter(q => q.subject === 'CG').length;
    
    return {
      anglais: questions.slice(0, angCount),
      cultureGenerale: questions.slice(angCount, angCount + cgCount),
      logique: questions.slice(angCount + cgCount)
    };
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    return Math.round((answeredQuestions.size / questions.length) * 100);
  };

  // Calculate subject scores
  const getSubjectScores = () => {
    const subjects = ['ANG', 'CG', 'LOG'];
    return subjects.map(subject => {
      const subjectQuestions = questions.filter(q => q.subject === subject);
      const subjectCorrect = subjectQuestions.reduce((count, q) => {
        const userAnswer = userAnswers.get(q.id);
        if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
          // Convert letter answer to number for comparison
          if (typeof userAnswer === 'string' && userAnswer.length === 1) {
            const answerIndex = userAnswer.charCodeAt(0) - 65;
            return answerIndex === q.correctAnswer ? count + 1 : count;
          }
          return userAnswer === q.correctAnswer ? count + 1 : count;
        } else if (q.type === 'true-false') {
          return String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase() ? count + 1 : count;
        }
        return userAnswer === q.correctAnswer ? count + 1 : count;
      }, 0);
      const subjectScore = subjectQuestions.length > 0 ? Math.round((subjectCorrect / subjectQuestions.length) * 100) : 0;
      
      return {
        subject,
        correct: subjectCorrect,
        total: subjectQuestions.length,
        score: subjectScore
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-white">Chargement de l'examen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Erreur: {error}</div>
          <button 
            onClick={onExit} 
            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Retour au menu principal
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    // Calculate results
    const correctAnswers = questions.reduce((count, q) => {
      const userAnswer = userAnswers.get(q.id);
      console.log(`🔍 Completion screen - Question ${q.id}: userAnswer=${userAnswer}, correctAnswer=${q.correctAnswer}`);
      
      if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
        // Convert letter answer to number for comparison
        if (typeof userAnswer === 'string' && userAnswer.length === 1) {
          const answerIndex = userAnswer.charCodeAt(0) - 65;
          const isCorrect = answerIndex === q.correctAnswer;
          console.log(`  Converted ${userAnswer} to ${answerIndex}, correct: ${isCorrect}`);
          return isCorrect ? count + 1 : count;
        }
        return userAnswer === q.correctAnswer ? count + 1 : count;
      } else if (q.type === 'true-false') {
        return String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase() ? count + 1 : count;
      }
      return userAnswer === q.correctAnswer ? count + 1 : count;
    }, 0);
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeSpent = 180 * 60 - timeRemaining;
    const subjectScores = getSubjectScores();

    return (
      <div className="h-screen bg-gray-900 flex flex-col results-page overflow-x-hidden">
        {/* Clean header without sidebar */}
        <header className="bg-blue-600 shadow-sm flex-shrink-0">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white">Examen Blanc #{examId} - Terminé</h1>
                  <div className="flex items-center gap-3 text-sm text-white mt-1">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Résultats disponibles
                    </span>
                    {/* Hide score and time on mobile */}
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">Score: {score}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                {/* Hide timer on mobile */}
                <div className="hidden sm:flex items-center gap-2 font-semibold text-white">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg">{formatTime(timeSpent)}</span>
                </div>
                <button 
                  onClick={confirmExit} 
                  className="text-white hover:text-blue-100 p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Full width results */}
        <div className="flex-1 overflow-y-auto bg-gray-50 overflow-x-hidden">
          <div className="h-full p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Examen Terminé !</h1>
              </div>
              
              {/* Overall Score */}
              <div className="text-center mb-8">
                <div className="text-6xl sm:text-7xl font-bold text-blue-600 mb-2">{score}%</div>
                <div className="text-lg text-gray-600">Score Global</div>
              </div>
              
              {/* Subject Scores */}
              <div className="subject-score-list max-w-2xl w-full mx-auto mb-8 text-center space-y-2">
                {subjectScores.map(({ subject, correct, total, score: subjectScore }) => (
                  <div key={subject} className="subject-score-item text-sm sm:text-base text-gray-600">
                    <span className="score-percentage text-base sm:text-lg font-semibold text-blue-600">
                      {subjectScore}%
                    </span>
                    <span className="mx-1 text-gray-300">•</span>
                    <span className="subject-name font-medium text-gray-800">{subject}</span>
                    <span className="mx-1 text-gray-300">•</span>
                    <span className="score-fraction text-gray-500 text-xs sm:text-sm">
                      {correct}/{total}
                    </span>
                  </div>
                ))}
              </div>

              {/* Time Spent */}
              <div className="text-center mb-8">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">{formatTime(timeSpent)}</div>
                <div className="text-sm text-gray-600">Temps Utilisé</div>
              </div>

              {/* Review Button */}
              <div className="text-center mb-8">
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Eye className="w-5 h-5" />
                  {showReview ? 'Masquer les réponses' : 'Réviser les réponses'}
                </button>
              </div>

              {/* Review Section - Fixed Layout */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                {showReview && (
                <div className="answer-review-container animate-in slide-in-from-top-4 duration-300 mt-8 space-y-6 w-full max-w-3xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">Révision des Réponses</h3>
                  {questions.map((question, index) => {
                    const userAnswer = userAnswers.get(question.id);
                    const isCorrect = (() => {
                      if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
                        // Convert user answer to number if it's a letter (A=0, B=1, C=2)
                        const userAnswerIndex = typeof userAnswer === 'string' && userAnswer.length === 1 
                          ? userAnswer.charCodeAt(0) - 65 
                          : userAnswer;
                        return userAnswerIndex === question.correctAnswer;
                      } else if (question.type === 'true-false') {
                        return String(userAnswer).toLowerCase() === String(question.correctAnswer).toLowerCase();
                      }
                      return userAnswer === question.correctAnswer;
                    })();

                    return (
                      <div key={question.id} className="answer-review-question relative border border-gray-200 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
                        {/* X Icon for incorrect or unanswered questions */}
                        {(!userAnswer || !isCorrect) && (
                          <div className="absolute top-4 right-4">
                            <XCircle className="w-6 h-6 text-red-500" />
                          </div>
                        )}
                        
                        {/* Question Header */}
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              question.subject === 'ANG' ? 'bg-green-100 text-green-800' :
                              question.subject === 'CG' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {question.subject}
                            </span>
                            <span className="text-sm text-gray-500">
                              {question.type === 'multiple-choice' ? 'Choix Multiple' : 'Vrai/Faux'}
                            </span>
                          </div>
                        </div>

                        {/* Question Text */}
                        <MathText
                          text={question.question}
                          block
                          className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4"
                        />

                        {/* Options and Answers - Use original working CSS classes */}
                        <div className="answer-review-options flex flex-col gap-3">
                          {question.type === 'multiple-choice' && question.options?.map((option, optionIndex) => {
                            // Convert user answer to number if it's a letter (A=0, B=1, C=2)
                            const userAnswerIndex = typeof userAnswer === 'string' && userAnswer.length === 1 
                              ? userAnswer.charCodeAt(0) - 65 
                              : userAnswer;
                            const isUserAnswer = userAnswerIndex === optionIndex;
                            const isCorrectAnswer = question.correctAnswer === optionIndex;
                            
                            let optionClass = 'answer-review-option flex items-start gap-3 rounded-lg border-2 p-3 transition-colors ';
                            if (isCorrectAnswer) {
                              optionClass += 'correct';
                            } else if (isUserAnswer && !isCorrectAnswer) {
                              optionClass += 'incorrect';
                            } else {
                              optionClass += 'neutral';
                            }
                            
                            return (
                              <div key={optionIndex} className={optionClass}>
                                <div className="answer-review-option-prefix w-7 h-7 rounded-full flex items-center justify-center font-semibold text-sm">
                                  {String.fromCharCode(65 + optionIndex)}
                                </div>
                                <div className="answer-review-option-text flex-1 text-sm leading-5">
                                  <MathText text={option} />
                                </div>
                                {isCorrectAnswer && (
                                  <div className="answer-review-status text-green-600 font-semibold text-sm">✓ Correct</div>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <div className="answer-review-status text-red-600 font-semibold text-sm">✗ Incorrect</div>
                                )}
                              </div>
                            );
                          })}
                          
                          {question.type === 'true-false' && ['Vrai', 'Faux'].map((option, optionIndex) => {
                            // V2: Compare indices, not string values
                            const isUserAnswer = userAnswer === optionIndex;
                            const isCorrectAnswer = question.correctAnswer === optionIndex;
                            
                            let optionClass = 'answer-review-option flex items-start gap-3 rounded-lg border-2 p-3 transition-colors ';
                            if (isCorrectAnswer) {
                              optionClass += 'correct';
                            } else if (isUserAnswer && !isCorrectAnswer) {
                              optionClass += 'incorrect';
                            } else {
                              optionClass += 'neutral';
                            }
                            
                            return (
                              <div key={option} className={optionClass}>
                                <div className="answer-review-option-prefix w-7 h-7 rounded-full flex items-center justify-center font-semibold text-sm">
                                  {optionIndex === 0 ? 'V' : 'F'}
                                </div>
                                <div className="answer-review-option-text flex-1 text-sm leading-5">
                                  <MathText text={option} />
                                </div>
                                {isCorrectAnswer && (
                                  <div className="answer-review-status text-green-600 font-semibold text-sm">✓ Correct</div>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <div className="answer-review-status text-red-600 font-semibold text-sm">✗ Incorrect</div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* User Answer Summary - Clean Layout */}
                        <div className="answer-summary bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
                          <div className="text-sm">
                            <span className="text-gray-600">Votre réponse:</span>
                            <span className={`ml-2 font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              <MathText
                                text={
                                  userAnswer
                                    ? question.type === 'multiple-choice'
                                      ? `${String.fromCharCode(
                                          65 +
                                            (typeof userAnswer === 'string' && userAnswer.length === 1
                                              ? userAnswer.charCodeAt(0) - 65
                                              : Number(userAnswer))
                                        )}: ${
                                          question.options?.[
                                            typeof userAnswer === 'string' && userAnswer.length === 1
                                              ? userAnswer.charCodeAt(0) - 65
                                              : Number(userAnswer)
                                          ] ?? ''
                                        }`
                                      : String(userAnswer)
                                    : 'Pas de réponse'
                                }
                              />
                            </span>
                          </div>
                        </div>

                        {/* Explanation if available */}
                        {question.explanation && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">Explication:</h4>
                            <MathText text={question.explanation} className="text-blue-800 text-sm" block />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button 
                  onClick={confirmExit}
                  className="px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-lg"
                >
                  Retour au menu principal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isCurrentQuestionAnswered = currentQuestion ? answeredQuestions.has(currentQuestion.id) : false;
  const isCurrentQuestionFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;
  const canGoNext = currentQuestionIndex < questions.length - 1;
  const canGoPrevious = currentQuestionIndex > 0;
  const subjectInfo = getCurrentSubjectInfo();
  const questionsBySubject = getQuestionsBySubject();
  const progressPercentage = getProgressPercentage();

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Erreur: Question non trouvée</div>
          <button 
            onClick={onExit} 
            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Retour au menu principal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      {/* Security Warning */}
      {tabSwitchCount > 0 && !warningDismissed && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            Attention: Changement d'onglet détecté ({tabSwitchCount}/2). L'examen se terminera automatiquement après 2 changements.
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            className="ml-4 p-1 hover:bg-red-700 rounded transition-colors"
            aria-label="Fermer l'avertissement"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {/* Single Blue Header - No White Bar */}
      <div className="bg-blue-600 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Hamburger Menu for Sidebar */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:text-blue-100 p-2 rounded-lg hover:bg-blue-700 transition-colors"
                title="Ouvrir/Fermer la liste des questions"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-white">Examen Blanc #{examId}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
              {/* Progress Bar - Hidden on mobile */}
              <div className="hidden sm:block exam-progress">
                <div 
                  className="exam-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              
              {/* Timer */}
              <div className="flex items-center gap-2 font-semibold text-white">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-lg">{formatTime(timeRemaining)}</span>
              </div>
              
              {/* Flag Button */}
              <button 
                onClick={handleFlagQuestion}
                className={`p-2 rounded-lg transition-colors ${
                  isCurrentQuestionFlagged 
                    ? 'bg-amber-500 text-white' 
                    : 'text-white hover:bg-blue-700'
                }`}
                title="Marquer pour révision"
              >
                <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {/* Terminer Button - Replaces X */}
              <button 
                onClick={() => {
                  console.log('🔘 Terminer button clicked');
                  handleFinishExam();
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
                title="Terminer l'examen"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Terminer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Questions List */}
        <div className={`bg-gray-800 w-80 transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        } fixed lg:relative z-30 h-full`}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Questions</h2>
                {/* Remove X button on mobile */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                {answeredQuestions.size} / {questions.length} répondues
              </div>
            </div>

            {/* Question Lists */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Anglais Section */}
              <div className="exam-sidebar-section">
                <div className="exam-sidebar-section-header">
                  <span className="exam-sidebar-section-title text-green-400">Anglais</span>
                  <span className="exam-sidebar-section-count">1-20</span>
                </div>
                <div className="exam-sidebar-section-content">
                  {questionsBySubject.anglais.map((q, index) => {
                    const globalIndex = index;
                    const isAnswered = userAnswers.has(q.id);
                    const isCurrent = globalIndex === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`qbtn ${isCurrent ? 'qbtn--current' : ''} ${isAnswered ? 'qbtn--answered' : ''} ${isFlagged ? 'qbtn--flagged' : ''}`}
                      >
                        {globalIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Culture Générale Section */}
              <div className="exam-sidebar-section">
                <div className="exam-sidebar-section-header">
                  <span className="exam-sidebar-section-title text-blue-400">Culture Générale</span>
                  <span className="exam-sidebar-section-count">21-40</span>
                </div>
                <div className="exam-sidebar-section-content">
                  {questionsBySubject.cultureGenerale.map((q, index) => {
                    const globalIndex = questionsBySubject.anglais.length + index;
                    const isAnswered = userAnswers.has(q.id);
                    const isCurrent = globalIndex === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`qbtn ${isCurrent ? 'qbtn--current' : ''} ${isAnswered ? 'qbtn--answered' : ''} ${isFlagged ? 'qbtn--flagged' : ''}`}
                      >
                        {globalIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logique Section */}
              <div className="exam-sidebar-section">
                <div className="exam-sidebar-section-header">
                  <span className="exam-sidebar-section-title text-yellow-400">Logique</span>
                  <span className="exam-sidebar-section-count">41-60</span>
                </div>
                <div className="exam-sidebar-section-content">
                  {questionsBySubject.logique.map((q, index) => {
                    const globalIndex = questionsBySubject.anglais.length + questionsBySubject.cultureGenerale.length + index;
                    const isAnswered = userAnswers.has(q.id);
                    const isCurrent = globalIndex === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`qbtn ${isCurrent ? 'qbtn--current' : ''} ${isAnswered ? 'qbtn--answered' : ''} ${isFlagged ? 'qbtn--flagged' : ''}`}
                      >
                        {globalIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Subject Header - Removed "Questions 1-20" */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${subjectInfo.color}-100 text-${subjectInfo.color}-800`}>
                  {subjectInfo.section}
                </span>
                <span className="text-gray-600 font-medium text-sm sm:text-base">
                  Question {currentQuestionIndex + 1} sur {questions.length}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="question-card">
              <MathText
                text={currentQuestion.question}
                block
                className="question-title text-lg sm:text-xl lg:text-2xl"
              />
              
              <div className="space-y-3">
                {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => {
                  const isSelected = selectedAnswer === String.fromCharCode(65 + index);
                  return (
                    <div
                      key={index}
                      onClick={() => handleAnswerSelect(String.fromCharCode(65 + index))}
                      className={`answer ${isSelected ? 'answer--selected' : ''}`}
                      tabIndex={0}
                    >
                      <div className="answer-prefix">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="answer-text text-sm sm:text-base">
                        <MathText text={option} />
                      </div>
                    </div>
                  );
                })}
                {currentQuestion.type === 'true-false' && ['Vrai', 'Faux'].map((option, index) => {
                  const answerValue = index === 0 ? 'true' : 'false';
                  const isSelected = selectedAnswer === answerValue;
                  return (
                    <div
                      key={option}
                      onClick={() => handleAnswerSelect(answerValue)}
                      className={`answer ${isSelected ? 'answer--selected' : ''}`}
                      tabIndex={0}
                    >
                      <div className="answer-prefix">
                        {index === 0 ? 'V' : 'F'}
                      </div>
                      <div className="answer-text text-sm sm:text-base">{option}</div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons - Updated */}
              <div className="exam-navigation">
                <button 
                  onClick={handlePreviousQuestion}
                  disabled={!canGoPrevious}
                  className="nav-button nav-button--secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Précédent</span>
                  <span className="sm:hidden">Préc</span>
                </button>
                
                <div className="flex gap-2 sm:gap-3">
                  <button 
                    onClick={handleFlagQuestion}
                    className={`nav-button nav-button--secondary ${
                      isCurrentQuestionFlagged ? 'bg-amber-100 text-amber-700 border-amber-300' : ''
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    <span className="hidden sm:inline">{isCurrentQuestionFlagged ? 'Marqué' : 'Marquer'}</span>
                  </button>
                  <button 
                    onClick={handleNextQuestion}
                    disabled={!canGoNext}
                    className="nav-button nav-button--primary"
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <span className="sm:hidden">Suiv</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay - Only show when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'} show`}>
          {toast.message}
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quitter l'examen ?</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir quitter l'examen ? Votre examen sera terminé automatiquement et vous ne pourrez pas le reprendre.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmExit}
                  className="px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  Quitter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
