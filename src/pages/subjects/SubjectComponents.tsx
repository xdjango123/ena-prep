import React from 'react';
import { BookOpen, Clock, BarChart, ChevronsRight, Repeat, Eye } from 'lucide-react';

export type TestDetails = {
    id: string;
    name: string;
    questions: number;
    time: number;
};

export const ActionButton: React.FC<{icon: React.ElementType, title: string, active?: boolean, onClick: () => void, color: string}> = ({ icon: Icon, title, active, onClick, color }) => {
    const colorClasses = {
        blue: { active: 'bg-blue-100 border-blue-300', icon: 'text-blue-600' },
        green: { active: 'bg-green-100 border-green-300', icon: 'text-green-600' },
        yellow: { active: 'bg-yellow-100 border-yellow-300', icon: 'text-yellow-600' }
    };
    const c = color as keyof typeof colorClasses;
    return (
        <button onClick={onClick} className={`p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm border transition-shadow cursor-pointer text-center ${active ? colorClasses[c].active : 'bg-white border-gray-200 hover:shadow-md'}`}>
            <Icon className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 mx-auto mb-2 sm:mb-3 ${colorClasses[c].icon}`} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">{title}</h3>
        </button>
    );
};

export const TestListItem: React.FC<{test: TestDetails, onStart: (test: TestDetails) => void, onReview?: (test: TestDetails) => void, color: string, result?: { score: number, timeSpent: number }}> = ({ test, onStart, onReview, color, result }) => {
    const colorClasses = {
        blue: { border: 'border-blue-500', text: 'text-blue-600', hover: 'hover:bg-blue-50', redo: 'bg-blue-500 hover:bg-blue-600' },
        green: { border: 'border-green-500', text: 'text-green-600', hover: 'hover:bg-green-50', redo: 'bg-green-500 hover:bg-green-600' },
        yellow: { border: 'border-yellow-500', text: 'text-yellow-600', hover: 'hover:bg-yellow-50', redo: 'bg-yellow-500 hover:bg-yellow-600' },
    };
    const c = colorClasses[color as keyof typeof colorClasses];
    return (
        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{test.name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-x-3 text-xs sm:text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3 sm:w-4 sm:h-4" /> {test.questions} questions</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 sm:w-4 sm:h-4" /> {test.time} minutes</span>
                    </div>
                </div>
                {result ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        <div className="text-center">
                            <p className={`font-bold text-base sm:text-lg ${c.text}`}>{result.score}%</p>
                            <p className="text-xs text-gray-500">Score</p>
                        </div>
                        <div className="flex gap-2">
                            {onReview && (
                                <button onClick={() => onReview(test)} className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg text-white transition-all w-full sm:w-auto ${c.redo}`}>
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Revoir</span>
                                </button>
                            )}
                            <button onClick={() => onStart(test)} className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg text-white transition-all w-full sm:w-auto ${c.redo}`}>
                                <Repeat className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Refaire</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => onStart(test)} className={`px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm font-semibold rounded-lg border transition-all w-full sm:w-auto ${c.border} ${c.text} ${c.hover}`}>
                        Start
                    </button>
                )}
            </div>
        </div>
    );
};

export const FilterPill: React.FC<{topic: string, activeTopic: string, setActiveTopic: (topic: string) => void, color: string}> = ({ topic, activeTopic, setActiveTopic, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500 text-white',
        green: 'bg-green-500 text-white',
        yellow: 'bg-yellow-500 text-white',
    };
    const activeClass = colorClasses[color as keyof typeof colorClasses] || '';
    return (
        <button onClick={() => setActiveTopic(topic)} className={`px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors ${activeTopic === topic ? activeClass : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {topic}
        </button>
    );
};

export const RecommendationBanner: React.FC<{recommendation: string}> = ({ recommendation }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 text-center">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <div className="text-center sm:text-left">
                <h3 className="font-bold text-blue-900 text-sm sm:text-base">Smart Recommendation</h3>
                <p className="text-xs sm:text-sm text-blue-700">{recommendation}</p>
            </div>
            <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 sm:ml-auto shrink-0" />
        </div>
    </div>
); 