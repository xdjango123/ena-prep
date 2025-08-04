import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { evaluationQuestions } from '../../data/evaluationQuestions';
import { EvaluationAnswer, EvaluationQuestion } from '../../types';
import { EvaluationResult } from '../../types/auth';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { Button } from '../ui/Button';

interface EvaluationModalProps {
  isOpen: boolean;
  onComplete: (result: EvaluationResult) => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({ isOpen, onComplete }) => {
  const { user } = useSupabaseAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<EvaluationAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const currentQuestion = evaluationQuestions[currentQuestionIndex];
  const totalQuestions = evaluationQuestions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Timer effect
  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeRemaining]);

  // Reset question start time when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
    setSelectedAnswer(null);
  }, [currentQuestionIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newAnswer: EvaluationAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer,
      timeSpent
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitTest(updatedAnswers);
    }
  };

  const calculateResults = (finalAnswers: EvaluationAnswer[]): EvaluationResult => {
    const subjectScores = {
      anglais: 0,
      cultureGenerale: 0,
      logique: 0
    };

    const subjectCounts = {
      anglais: 0,
      cultureGenerale: 0,
      logique: 0
    };

    let totalCorrect = 0;

    finalAnswers.forEach(answer => {
      const question = evaluationQuestions.find(q => q.id === answer.questionId);
      if (!question) return;

      subjectCounts[question.subject]++;
      
      if (answer.selectedAnswer === question.correctAnswer) {
        subjectScores[question.subject]++;
        totalCorrect++;
      }
    });

    // Convert to percentages
    Object.keys(subjectScores).forEach(subject => {
      const key = subject as keyof typeof subjectScores;
      if (subjectCounts[key] > 0) {
        subjectScores[key] = Math.round((subjectScores[key] / subjectCounts[key]) * 100);
      }
    });

    const overallScore = Math.round((totalCorrect / totalQuestions) * 100);

    // Determine strengths and weaknesses
    const scores = Object.entries(subjectScores);
    const sortedScores = scores.sort(([,a], [,b]) => b - a);
    
    const strengths = sortedScores.filter(([,score]) => score >= 70).map(([subject]) => {
      switch(subject) {
        case 'anglais': return 'Anglais';
        case 'cultureGenerale': return 'Culture générale';
        case 'logique': return 'Logique';
        default: return subject;
      }
    });

    const weaknesses = sortedScores.filter(([,score]) => score < 50).map(([subject]) => {
      switch(subject) {
        case 'anglais': return 'Anglais';
        case 'cultureGenerale': return 'Culture générale';
        case 'logique': return 'Logique';
        default: return subject;
      }
    });

    const recommendations = [];
    if (weaknesses.length > 0) {
      recommendations.push(`Concentrez-vous sur : ${weaknesses.join(', ')}`);
    }
    if (strengths.length > 0) {
      recommendations.push(`Maintenez votre niveau en : ${strengths.join(', ')}`);
    }

    return {
      id: `eval_${Date.now()}`,
      userId: user?.id || '',
      overallScore,
      subjectScores,
      strengths,
      weaknesses,
      recommendations,
      completedAt: new Date()
    };
  };

  const submitTest = (finalAnswers = answers) => {
    const result = calculateResults(finalAnswers);
    onComplete(result);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary-500 text-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Évaluation Personnalisée</h2>
              <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full">
                <Clock size={16} />
                <span className="font-mono">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Question {currentQuestionIndex + 1} sur {totalQuestions}</span>
                <span>{Math.round(progress)}% terminé</span>
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-neutral-100 rounded-full text-sm font-medium">
                  {currentQuestion.subject === 'anglais' ? 'Anglais' :
                   currentQuestion.subject === 'cultureGenerale' ? 'Culture générale' :
                   'Logique'}
                </span>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                  {currentQuestion.difficulty}
                </span>
              </div>
              <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>
            </div>

            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left border rounded-lg transition-all hover:bg-neutral-50 ${
                    selectedAnswer === index
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === index
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300'
                    }`}>
                      {selectedAnswer === index && <CheckCircle size={16} className="text-white" />}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-neutral-500">
                {timeRemaining < 60 && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={16} />
                    <span>Temps bientôt écoulé !</span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className="px-6"
              >
                {currentQuestionIndex === totalQuestions - 1 ? 'Terminer' : 'Suivant'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}; 