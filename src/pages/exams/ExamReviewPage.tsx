import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, Minus } from 'lucide-react';
import { QuestionService } from '../../services/questionService';
import { ExamResultService } from '../../services/examResultService';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { formatExponents } from '../../utils/mathFormatting';

interface Question {
  id: string;
  question_text: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string | null;
  correct: string;
  explanation: string;
  category: string;
  difficulty: string;
}

export const ExamReviewPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user, profile, selectedExamType } = useSupabaseAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [examResult, setExamResult] = useState<any>(null);

  // Get user's exam type, use same logic as ExamPage for consistency
  const userExamType = selectedExamType || profile?.plan_name || 'CM';

  useEffect(() => {
    const loadExamData = async () => {
      if (!examId || !user) return;

      try {
        setLoading(true);

        // Load questions for all subjects
        const [angQuestions, cgQuestions, logQuestions] = await Promise.all([
          QuestionService.getExamBlancQuestions('ANG', examId, userExamType as 'CM' | 'CMS' | 'CS', 20),
          QuestionService.getExamBlancQuestions('CG', examId, userExamType as 'CM' | 'CMS' | 'CS', 20),
          QuestionService.getExamBlancQuestions('LOG', examId, userExamType as 'CM' | 'CMS' | 'CS', 20)
        ]);

        // Combine all questions
        const allQuestions = [...angQuestions, ...cgQuestions, ...logQuestions].map(question => ({
          ...question,
          question_text: formatExponents(question.question_text),
          answer1: formatExponents(question.answer1),
          answer2: formatExponents(question.answer2),
          answer3: formatExponents(question.answer3),
          answer4: question.answer4 ? formatExponents(question.answer4) : null,
          explanation: question.explanation ? formatExponents(question.explanation) : ''
        }));
        setQuestions(allQuestions);

        // Load exam result
        const result = await ExamResultService.getExamResult(
          user.id,
          userExamType as 'CM' | 'CMS' | 'CS',
          parseInt(examId)
        );
        setExamResult(result);

        // Load real user answers from the database
        console.log('🔍 Loading user answers for exam:', examId);
        const realAnswers = await ExamResultService.getUserAnswers(
          user.id,
          userExamType as 'CM' | 'CMS' | 'CS',
          parseInt(examId)
        );
        console.log('📊 Loaded user answers:', realAnswers.size, 'answers');
        console.log('📊 User answers:', Array.from(realAnswers.entries()).slice(0, 5)); // Show first 5
        setUserAnswers(realAnswers);

      } catch (error) {
        console.error('Error loading exam data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [examId, user, userExamType]);

  const getOptionText = (question: Question, option: string) => {
    switch (option) {
      case 'A': return question.answer1;
      case 'B': return question.answer2;
      case 'C': return question.answer3;
      case 'D': return question.answer4 || '';
      default: return '';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ANG': return 'bg-green-100 text-green-800';
      case 'CG': return 'bg-blue-100 text-blue-800';
      case 'LOG': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'ANG': return 'Anglais';
      case 'CG': return 'Culture Générale';
      case 'LOG': return 'Logique';
      default: return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/exams')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Examen Blanc #{examId} - Révision des Réponses
                </h1>
                {examResult && (
                  <p className="text-sm text-gray-600">
                    Score: {examResult.score}% • Terminé le {new Date(examResult.created_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>3h 00min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = userAnswers.get(question.id);
            const isCorrect = userAnswer === question.correct;
            const correctAnswerText = getOptionText(question, question.correct);
            const userAnswerText = userAnswer ? getOptionText(question, userAnswer) : "Pas de réponse";

            return (
              <div key={question.id} className="bg-white rounded-lg shadow-sm border p-6">
                {/* Question Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(question.category)}`}>
                      {getCategoryName(question.category)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <div className="mb-4">
                  <p className="text-gray-900 font-medium">{question.question_text}</p>
                </div>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {['A', 'B', 'C'].map((option) => {
                    const optionText = getOptionText(question, option);
                    const isUserAnswer = userAnswer === option;
                    const isCorrectAnswer = question.correct === option;
                    
                    let bgColor = 'bg-gray-50 border-gray-200';
                    if (isCorrectAnswer) {
                      bgColor = 'bg-green-50 border-green-200';
                    } else if (isUserAnswer && !isCorrectAnswer) {
                      bgColor = 'bg-red-50 border-red-200';
                    }

                    return (
                      <div
                        key={option}
                        className={`p-3 rounded-lg border ${bgColor} ${
                          isCorrectAnswer ? 'ring-2 ring-green-200' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCorrectAnswer ? 'bg-green-600 text-white' : 
                            isUserAnswer ? 'bg-red-600 text-white' : 
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {option}
                          </span>
                          <span className="text-gray-900">{optionText}</span>
                          {isCorrectAnswer && (
                            <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* User Answer Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Votre réponse:</span>
                      <span className={`ml-2 font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {userAnswerText || 'Pas de réponse'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bonne réponse:</span>
                      <span className="ml-2 font-medium text-green-600">{correctAnswerText}</span>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Explication:</h4>
                  <p className="text-blue-800 text-sm">{question.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/dashboard/exams')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour aux examens
          </button>
        </div>
      </div>
    </div>
  );
};
