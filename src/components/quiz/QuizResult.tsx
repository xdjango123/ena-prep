import React from 'react';
import { Award, Clock, Hash, CheckCircle, Repeat, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuizResultProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  onRedo: () => void;
  onReview: () => void;
  onExit: () => void;
  subjectColor: string;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  timeSpent,
  onRedo,
  onReview,
  onExit,
  subjectColor
}) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6">
      <div className={`bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center border-t-4 border-${subjectColor}-500`}>
        <Award className={`w-16 h-16 text-${subjectColor}-500 mx-auto mb-4`} />
        <h2 className="text-3xl font-bold mb-2">Test Terminé !</h2>
        <p className="text-gray-600 mb-8">Félicitations, voici vos résultats.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className={`text-3xl font-bold text-${subjectColor}-600`}>{score}%</h3>
            <p className="text-sm text-gray-500">Score</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-3xl font-bold">{correctAnswers}/{totalQuestions}</h3>
            <p className="text-sm text-gray-500">Correct</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-3xl font-bold">{formatTime(timeSpent)}</h3>
            <p className="text-sm text-gray-500">Temps</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-3xl font-bold">{totalQuestions}</h3>
            <p className="text-sm text-gray-500">Questions</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={onRedo}
            className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-${subjectColor}-500 text-white font-semibold hover:bg-${subjectColor}-600 transition-colors`}
          >
            <Repeat className="w-5 h-5" />
            Refaire le test
          </button>
          <button 
            onClick={onReview}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
          >
            <Eye className="w-5 h-5" />
            Revoir les réponses
          </button>
        </div>
        <div className="mt-6">
            <button onClick={onExit} className="text-sm text-gray-500 hover:underline">
                Retour à la page de la matière
            </button>
        </div>
      </div>
    </div>
  );
}; 