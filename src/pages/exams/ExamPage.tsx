import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, Shield, Play, AlertCircle, CheckCircle, Trophy, Brain } from 'lucide-react';
import { PreExamRules } from '../../components/quiz/PreExamRules';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

interface Exam {
  id: string;
  title: string;
  duration: number; // in minutes
  questionCount: number;
  description: string;
  isSecure: boolean;
  examType: string;
}

export const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useSupabaseAuth();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Get user's exam type to filter available exams
  const userExamType = profile?.exam_type || 'CS';

  // Generate 10 examens blancs based on user's exam type
  const generateExams = (): Exam[] => {
    const exams: Exam[] = [];
    for (let i = 1; i <= 10; i++) {
      exams.push({
        id: i.toString(),
        title: `Examen Blanc #${i}`,
        duration: 180, // 3 hours
        questionCount: 60, // 20 ANG + 20 CG + 20 LOG
        description: 'Examen de révision générale',
        isSecure: true,
        examType: userExamType
      });
    }
    return exams;
  };

  const exams = generateExams();

  const handleStartExam = (exam: Exam) => {
    setSelectedExam(exam);
    setShowRules(true);
  };

  const handleBeginExam = () => {
    if (selectedExam) {
      setShowRules(false);
      navigate(`/dashboard/secure-exam/${selectedExam.id}`);
    }
  };

  const handleGoBack = () => {
    setShowRules(false);
    setSelectedExam(null);
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Examens Blancs</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Testez vos connaissances avec nos examens blancs complets
          </p>
        </div>

        {/* Important Instructions - Simplified on Mobile */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Instructions importantes</h3>
              {/* Desktop: Full instructions */}
              <ul className="hidden sm:block text-blue-800 space-y-1 text-sm">
                <li>• Chaque examen dure 3 heures et contient 60 questions (20 Anglais, 20 Culture Générale, 20 Logique)</li>
                <li>• Mode sécurisé activé - ne quittez pas la page pendant l'examen</li>
                <li>• Navigation libre entre les questions</li>
                <li>• Sauvegarde automatique des réponses</li>
              </ul>
              {/* Mobile: Simplified instructions */}
              <div className="sm:hidden text-blue-800 text-sm space-y-1">
                <p>• 3h • 60 questions • Mode sécurisé</p>
                <p>• Navigation libre • Sauvegarde auto</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exams List */}
        <div className="space-y-4">
          {exams.map((exam) => (
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
                </div>
                
                <p className="text-gray-600 mb-3 text-sm">{exam.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{Math.floor(exam.duration / 60)}h {exam.duration % 60}min</span>
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
                
                <button
                  onClick={() => handleStartExam(exam)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Commencer l'examen
                </button>
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
                    </div>
                    <p className="text-gray-600 mb-4">{exam.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{Math.floor(exam.duration / 60)}h {exam.duration % 60}min</span>
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
                  
                  <div className="ml-6">
                    <button
                      onClick={() => handleStartExam(exam)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Commencer l'examen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 sm:mt-12 text-center text-gray-500 text-xs sm:text-sm">
          <p>Les examens blancs sont conçus pour simuler les conditions réelles de l'examen ENA</p>
        </div>
      </div>
    </div>
  );
};
