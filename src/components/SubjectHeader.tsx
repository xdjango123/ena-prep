import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';

interface SubjectHeaderProps {
  subjectName: string;
  icon: React.ElementType;
  score: number;
  testsTaken: number;
  timeSpent: number; // in minutes
  gradientFrom: string;
  gradientTo: string;
}

export const SubjectHeader: React.FC<SubjectHeaderProps> = ({
  subjectName,
  icon: Icon,
  score,
  testsTaken,
  timeSpent,
  gradientFrom,
  gradientTo
}) => {
  return (
    <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-xl p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8 text-white" />
          <h1 className="text-2xl font-bold text-white">{subjectName}</h1>
        </div>
        <Link to="/dashboard" className="text-sm font-medium text-white/90 hover:text-white transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Tableau de bord
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="flex flex-col items-center justify-center p-2">
          <div className="text-3xl font-bold text-white">{score}%</div>
          <div className="text-white/90 flex items-center gap-1.5 group relative">
            Score
            <Info className="w-4 h-4 cursor-help" />
            <div className="absolute bottom-full mb-2 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Ceci est le score moyen de tous les tests pratiques que vous avez terminés dans cette matière.
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-2">
          <div className="text-3xl font-bold text-white">{testsTaken}</div>
          <div className="text-white/90">Tests terminés</div>
        </div>
        <div className="flex flex-col items-center justify-center p-2">
          <div className="text-3xl font-bold text-white">{timeSpent}h</div>
          <div className="text-white/90">Temps d'étude</div>
        </div>
      </div>
    </div>
  );
}; 