import React from 'react';
import { FileText, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ExamPageProps {
  examNumber: number;
}

export const ExamPage: React.FC<ExamPageProps> = ({ examNumber }) => {
  const { user } = useAuth();
  
  // Mock user progress - in real app this would come from backend
  const userProgress = 75; // Example: 75% overall progress
  
  const getExamRequirement = (examNum: number) => {
    switch (examNum) {
      case 1:
      case 2:
        return 80;
      case 3:
        return 90;
      default:
        return 80;
    }
  };

  const requirement = getExamRequirement(examNumber);
  const canTakeExam = userProgress >= requirement;
  const hasCompletedExam = false; // Mock - would check if user has taken this exam

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Examen Blanc {examNumber}</h1>
        </div>
        <p className="text-indigo-100">
          Examen complet simulant les conditions réelles du concours ENA
        </p>
      </div>

      {/* Exam Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Statut de l'examen</h2>
          {canTakeExam ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Disponible</span>
            </div>
          ) : (
            <div className="flex items-center text-orange-600">
              <Lock className="w-5 h-5 mr-2" />
              <span className="font-medium">Verrouillé</span>
            </div>
          )}
        </div>

        {/* Progress Requirement */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progression requise: {requirement}%
            </span>
            <span className="text-sm font-medium text-gray-700">
              Votre progression: {userProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                userProgress >= requirement ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(userProgress, 100)}%` }}
            ></div>
          </div>
          {userProgress < requirement && (
            <p className="text-sm text-orange-600 mt-2">
              Vous devez atteindre {requirement}% de progression pour débloquer cet examen.
            </p>
          )}
        </div>

        {/* Exam Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">120</div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">3h</div>
            <div className="text-sm text-gray-600">Durée</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">1</div>
            <div className="text-sm text-gray-600">Tentative</div>
          </div>
        </div>

        {/* Action Button */}
        {canTakeExam ? (
          hasCompletedExam ? (
            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg">
                <CheckCircle className="w-5 h-5 mr-2" />
                Examen terminé
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Vous avez déjà passé cet examen. Consultez vos résultats dans votre profil.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <button className="inline-flex items-center px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                <FileText className="w-5 h-5 mr-2" />
                Commencer l'examen
              </button>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ Attention: Une fois commencé, vous ne pourrez pas reprendre l'examen plus tard.
              </p>
            </div>
          )
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg">
              <Lock className="w-5 h-5 mr-2" />
              Examen verrouillé
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Continuez à étudier pour débloquer cet examen.
            </p>
          </div>
        )}
      </div>

      {/* Exam Content Preview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenu de l'examen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Culture Générale</h4>
            <p className="text-sm text-gray-600">30 questions - 45 minutes</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Anglais</h4>
            <p className="text-sm text-gray-600">30 questions - 45 minutes</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Aptitude Numérique</h4>
            <p className="text-sm text-gray-600">30 questions - 45 minutes</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Français</h4>
            <p className="text-sm text-gray-600">30 questions - 45 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 