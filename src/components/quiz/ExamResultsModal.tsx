import React from 'react';
import { X, Trophy, BarChart3, Clock, CheckCircle, XCircle, Minus } from 'lucide-react';
import { ExamResult } from '../../services/examResultService';

interface ExamResultsModalProps {
  exam: {
    id: string;
    title: string;
    examType: string;
  };
  result: ExamResult;
  onClose: () => void;
}

export const ExamResultsModal: React.FC<ExamResultsModalProps> = ({
  exam,
  result,
  onClose
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{exam.title}</h2>
              <p className="text-sm text-gray-600">Résultats de l'examen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(result.score)} mb-4`}>
              <span className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Score Global</h3>
            <p className="text-sm text-gray-600">
              {result.score >= 80 ? 'Excellent travail!' : 
               result.score >= 60 ? 'Bon travail!' : 
               result.score >= 40 ? 'Pas mal, continuez!' : 
               'Continuez à vous entraîner!'}
            </p>
          </div>

          {/* Exam Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Détails de l'examen
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Type d'examen:</span>
                <span className="ml-2 font-medium">{exam.examType}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(result.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Heure:</span>
                <span className="ml-2 font-medium">
                  {new Date(result.created_at).toLocaleTimeString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Durée:</span>
                <span className="ml-2 font-medium">3h 00min</span>
              </div>
            </div>
          </div>

          {/* Scoring System */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Système de notation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Bonne réponse: <strong>+1 point</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Minus className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">Pas de réponse: <strong>0 point</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-gray-700">Mauvaise réponse: <strong>-1 point</strong></span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Recommandations</h4>
            <p className="text-sm text-yellow-800">
              {result.score >= 80 ? 
                'Félicitations! Votre niveau est excellent. Continuez à vous entraîner pour maintenir ce niveau.' :
                result.score >= 60 ? 
                'Bon travail! Vous êtes sur la bonne voie. Concentrez-vous sur les matières où vous avez des difficultés.' :
                result.score >= 40 ? 
                'Continuez à vous entraîner! Identifiez vos points faibles et travaillez-les spécifiquement.' :
                'Ne vous découragez pas! L\'entraînement régulier vous aidera à progresser. Concentrez-vous sur les bases.'
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
