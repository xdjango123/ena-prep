import React from 'react';
import { BookOpen, Clock, BarChart, ChevronsRight, Repeat } from 'lucide-react';

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
        <button onClick={onClick} className={`p-6 rounded-xl shadow-sm border transition-shadow cursor-pointer text-center ${active ? colorClasses[c].active : 'bg-white border-gray-200 hover:shadow-md'}`}>
            <Icon className={`w-10 h-10 mx-auto mb-3 ${colorClasses[c].icon}`} />
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        </button>
    );
};

export const TestListItem: React.FC<{test: TestDetails, onStart: (test: TestDetails) => void, color: string, result?: { score: number, timeSpent: number }}> = ({ test, onStart, color, result }) => {
    const colorClasses = {
        blue: { border: 'border-blue-500', text: 'text-blue-600', hover: 'hover:bg-blue-50', redo: 'bg-blue-500 hover:bg-blue-600' },
        green: { border: 'border-green-500', text: 'text-green-600', hover: 'hover:bg-green-50', redo: 'bg-green-500 hover:bg-green-600' },
        yellow: { border: 'border-yellow-500', text: 'text-yellow-600', hover: 'hover:bg-yellow-50', redo: 'bg-yellow-500 hover:bg-yellow-600' },
    };
    const c = colorClasses[color as keyof typeof colorClasses];
    return (
        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div>
                <h3 className="font-semibold text-gray-800">{test.name}</h3>
                <div className="flex items-center gap-x-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {test.questions} questions</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {test.time} minutes</span>
                </div>
            </div>
            {result ? (
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <p className={`font-bold text-xl ${c.text}`}>{result.score}%</p>
                        <p className="text-xs text-gray-500">Score</p>
                    </div>
                    <button onClick={() => onStart(test)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all ${c.redo}`}>
                        <Repeat className="w-4 h-4" />
                        Refaire
                    </button>
                </div>
            ) : (
                <button onClick={() => onStart(test)} className={`px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all ${c.border} ${c.text} ${c.hover}`}>
                    Start
                </button>
            )}
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
        <button onClick={() => setActiveTopic(topic)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${activeTopic === topic ? activeClass : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {topic}
        </button>
    );
};

export const RecommendationBanner: React.FC<{recommendation: string}> = ({ recommendation }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-center">
        <div className="flex justify-center items-center gap-3">
            <BarChart className="w-6 h-6 text-blue-600" />
            <div className="text-left">
                <h3 className="font-bold text-blue-900">Smart Recommendation</h3>
                <p className="text-sm text-blue-700">{recommendation}</p>
            </div>
            <ChevronsRight className="w-5 h-5 text-blue-500 ml-auto shrink-0" />
        </div>
    </div>
); 