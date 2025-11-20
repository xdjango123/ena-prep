import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, Shield, Play, AlertCircle, CheckCircle, Trophy, Brain, RotateCcw, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { PreExamRules } from '../../components/quiz/PreExamRules';
import { ExamResultService, ExamResult } from '../../services/examResultService';
import { examenBlancService, ExamenBlanc } from '../../services/examenBlancService';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

interface Exam {
  id: string;
  title: string;
  duration: number; // in minutes
  questionCount: number;
  description: string;
  isSecure: boolean;
  examType: string;
  examNumber: number;
}

const EXAMS_PER_PAGE = 10;

export const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, selectedExamType } = useSupabaseAuth();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [examResults, setExamResults] = useState<Map<string, ExamResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [examList, setExamList] = useState<Exam[]>([]);
  const [examListLoading, setExamListLoading] = useState(true);
  const [examListError, setExamListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const scrollToTopSmooth = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToTopSmooth();
  }, [currentPage]);

  // Get user's exam type to filter available exams - prioritize selectedExamType
  const userExamType = selectedExamType || profile?.plan_name || 'CM';

  // Load exam results
  const loadExamResults = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const results = await ExamResultService.getExamResultsByType(
        user.id,
        userExamType as 'CM' | 'CMS' | 'CS'
      );

      // Create a map for easy lookup
      const resultsMap = new Map<string, ExamResult>();
      results.forEach(result => {
        const key = `${result.exam_type}-${result.test_number}`;
        if (!resultsMap.has(key)) {
          resultsMap.set(key, result);
        }
      });

      setExamResults(resultsMap);
    } catch (error) {
      console.error('Error loading exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamResults();
  }, [user, userExamType]);

  // Reload results when page becomes visible (user returns from exam)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadExamResults();
      }
    };

    const handleFocus = () => {
      if (user) {
        loadExamResults();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    setExamListLoading(true);
    setExamListError(null);

    examenBlancService
      .getExamensBlancs(userExamType as 'CM' | 'CMS' | 'CS')
      .then((examens: ExamenBlanc[]) => {
        if (!isMounted) return;
        const parsed: Exam[] = examens.map(examen => ({
          id: examen.exam_number.toString(),
          title: `Examen Blanc #${examen.exam_number}`,
          duration: 180,
          questionCount: examen.total_questions,
          description: 'Examen de révision générale',
          isSecure: true,
          examType: examen.exam_type,
          examNumber: examen.exam_number
        }));
        setExamList(parsed);
        setCurrentPage(1);
      })
      .catch(error => {
        console.error('Error loading available examens blancs:', error);
        if (isMounted) {
          setExamList([]);
          setCurrentPage(1);
          setExamListError(
            "Impossible de charger la liste d'examens blancs. Vérifiez la base de données."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setExamListLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userExamType]);

  const handleStartExam = (exam: Exam) => {
    setSelectedExam(exam);
    setShowRules(true);
    scrollToTopSmooth();
  };

  const handleBeginExam = () => {
    if (selectedExam) {
      setShowRules(false);
      navigate(`/dashboard/secure-exam/${selectedExam.examNumber}`);
      scrollToTopSmooth();
    }
  };

  const handleGoBack = () => {
    setShowRules(false);
    setSelectedExam(null);
  };

  const handleRetakeExam = async (exam: Exam) => {
    if (!user) return;

    try {
      // Delete existing result
      await ExamResultService.deleteExamResult(
        user.id,
        userExamType as 'CM' | 'CMS' | 'CS',
        exam.examNumber
      );

      // Remove from local state
      const key = `${userExamType}-${exam.examNumber}`;
      setExamResults(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });

      // Start the exam
      setSelectedExam(exam);
      setShowRules(true);
      scrollToTopSmooth();
    } catch (error) {
      console.error('Error retaking exam:', error);
    }
  };

  const handleViewResults = (exam: Exam) => {
    navigate(`/dashboard/exam-review/${exam.id}`);
    scrollToTopSmooth();
  };

  const getExamResult = (exam: Exam): ExamResult | null => {
    const key = `${userExamType}-${exam.examNumber}`;
    return examResults.get(key) || null;
  };

  if (showRules && selectedExam) {
    return (
      <PreExamRules
        examTitle={selectedExam.title}
        examDuration={selectedExam.duration}
        questionCount={selectedExam.questionCount}
        onStartExam={handleBeginExam}
        onGoBack={handleGoBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Examens blancs</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Testez vos connaissances avec nos examens blancs complets
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto w-full space-y-6 sm:space-y-8 px-1 xs:px-2 sm:px-0">

        {/* Important Instructions - Simplified on Mobile */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Instructions importantes</h3>
              {/* Desktop: Full instructions */}
              <ul className="hidden sm:block text-blue-800 space-y-1 text-sm">
                <li>• Chaque examen dure 3 heures et contient 60 questions (20 Anglais, 20 CG, 20 Logique)</li>
                <li>• <strong>Notation:</strong> -1 pour mauvaise réponse, 0 pour pas de réponse, +1 pour bonne réponse</li>
                <li>• Mode sécurisé activé - ne quittez pas la page pendant l'examen</li>
                <li>• Navigation libre entre les questions</li>
                <li>• Sauvegarde automatique des réponses</li>
              </ul>
              {/* Mobile: Simplified instructions */}
              <div className="sm:hidden text-blue-800 text-sm space-y-1">
                <p>• 3h • 60 questions • Mode sécurisé</p>
                <p>• <strong>Notation:</strong> -1/0/+1 • Navigation libre</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exams List */}
        {examListError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {examListError}
          </div>
        )}

        {examListLoading ? (
          <div className="flex justify-center py-10 text-gray-500">
            Chargement des examens disponibles...
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {examList.length === 0 && (
              <div className="rounded border border-gray-200 bg-white p-4 text-center text-gray-600">
                Aucun examen blanc n'est disponible pour le moment. Ajoutez des questions et relancez
                l'assignation.
              </div>
            )}
            {examList
              .slice((currentPage - 1) * EXAMS_PER_PAGE, currentPage * EXAMS_PER_PAGE)
              .map(exam => {
              const result = getExamResult(exam);

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                >
                  {/* Mobile Layout */}
                  <div className="sm:hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {exam.examType}
                        </span>
                      </div>
                      {result && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            <BarChart3 className="w-3 h-3" />
                            <span>{result.score}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3 text-sm">{exam.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {Math.floor(exam.duration / 60)}h {exam.duration % 60}min
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{exam.questionCount} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>Sécurisé</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {result ? (
                        <>
                          <button
                            onClick={() => handleRetakeExam(exam)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Refaire
                          </button>
                          <button
                            onClick={() => handleViewResults(exam)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4" />
                            Voir Résultats
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Commencer l'examen
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:block">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {exam.examType}
                          </span>
                          {result && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                              <BarChart3 className="w-4 h-4" />
                              <span>Score: {result.score}%</span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{exam.description}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {Math.floor(exam.duration / 60)}h {exam.duration % 60}min
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            <span>{exam.questionCount} questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            <span>Mode sécurisé</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 flex gap-3">
                        {result ? (
                          <>
                            <button
                              onClick={() => handleRetakeExam(exam)}
                              className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                            >
                              <RotateCcw className="w-5 h-5" />
                              Refaire
                            </button>
                            <button
                              onClick={() => handleViewResults(exam)}
                              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <BarChart3 className="w-5 h-5" />
                              Voir Résultats
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartExam(exam)}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Play className="w-5 h-5" />
                            Commencer l'examen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            );
          })}
          </div>
          {examList.length > EXAMS_PER_PAGE && (
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} sur {Math.ceil(examList.length / EXAMS_PER_PAGE)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(prev =>
                    Math.min(Math.ceil(examList.length / EXAMS_PER_PAGE), prev + 1)
                  )
                }
                disabled={currentPage === Math.ceil(examList.length / EXAMS_PER_PAGE)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          </>
        )}

        {/* Footer Info */}
        <div className="mt-6 sm:mt-8 text-center text-gray-500 text-xs sm:text-sm">
          <p>Les examens blancs sont conçus pour simuler les conditions réelles de l'examen ENA</p>
        </div>
        </div>
      </div>
    </div>
  );
};
