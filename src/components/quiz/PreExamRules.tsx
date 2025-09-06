import React, { useState } from 'react';
import { Shield, Clock, Eye, Mouse, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface PreExamRulesProps {
  examTitle: string;
  examDuration: number; // in minutes
  questionCount: number;
  onStartExam: () => void;
  onGoBack: () => void;
}

export const PreExamRules: React.FC<PreExamRulesProps> = ({
  examTitle,
  examDuration,
  questionCount,
  onStartExam,
  onGoBack
}) => {
  const handleStartExam = async () => {
    // Start the exam without fullscreen requirement
    onStartExam();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Règles de l'Examen</h1>
          </div>
          <h2 className="text-xl text-gray-600 mb-2">{examTitle}</h2>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(examDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{questionCount} questions</span>
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Répartition des questions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>20 questions d'Anglais</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>20 questions de Culture Générale</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>20 questions de Logique</span>
            </div>
          </div>
        </div>

        {/* Rules Section - Shortened */}
        <div className="space-y-6 mb-8">
          {/* Security Rules */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">Règles de Sécurité</h3>
            </div>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Mode examen sécurisé - ne quittez pas cette page</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Changement d'onglet = fin d'examen automatique</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Surveillance automatique activée</span>
              </li>
            </ul>
          </div>

          {/* Exam Rules */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mouse className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Règles de l'Examen</h3>
            </div>
            <ul className="space-y-2 text-green-700">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Durée: {formatDuration(examDuration)} - soumission automatique</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Navigation libre entre les questions</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Sauvegarde automatique des réponses</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onGoBack}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
            Retourner
          </button>
          <button
            onClick={handleStartExam}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Shield className="w-5 h-5" />
            Commencer l'Examen
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>En cliquant sur "Commencer l'Examen", vous acceptez de respecter toutes les règles énoncées ci-dessus.</p>
        </div>
      </div>
    </div>
  );
};
