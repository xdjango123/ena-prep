import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Calculator, Globe, Languages, ChevronRight, Sparkles, BrainCircuit } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/ui/Container';

const subjects = [
  { name: 'Culture Générale', icon: <Globe className="w-6 h-6 text-blue-500" />, path: '/dashboard/subject/general-knowledge' },
  { name: 'Anglais', icon: <Languages className="w-6 h-6 text-green-500" />, path: '/dashboard/subject/english' },
  { name: 'Logique', icon: <BrainCircuit className="w-6 h-6 text-yellow-500" />, path: '/dashboard/subject/logic' },
];

export default function PracticePage() {
  const navigate = useNavigate();

  const handleStartRandomTest = () => {
    // Navigate to a random quiz. The subject can be picked randomly here or in the QuizSeries component
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const subjectKey = randomSubject.path.split('/').pop();
    navigate(`/quiz/series/random_${subjectKey}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800">Choisissez votre mode de pratique</h1>
            <p className="mt-4 text-lg text-gray-600">
              Lancez une série de questions aléatoires pour un défi surprise, ou concentrez-vous sur une matière spécifique.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Random Practice */}
            <div className="mb-10">
              <button
                onClick={handleStartRandomTest}
                className="w-full bg-primary-500 text-white p-8 rounded-xl shadow-lg hover:bg-primary-600 transition-all text-left flex items-center justify-between"
              >
                <div>
                  <Sparkles className="w-10 h-10 mb-3" />
                  <h2 className="text-2xl font-bold">Série de questions aléatoires</h2>
                  <p className="mt-1">Testez vos connaissances sur toutes les matières</p>
                </div>
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            {/* Specific Subject Practice */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Ou choisissez une matière</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subjects.map(subject => (
                  <Link
                    to={subject.path}
                    key={subject.name}
                    className="flex items-center bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg hover:border-primary-300 transition-all"
                  >
                    <div className="p-3 bg-gray-100 rounded-full mr-4">
                      {subject.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{subject.name}</h3>
                      <p className="text-primary-500 font-semibold mt-1">
                        Commencer la pratique <ChevronRight className="w-4 h-4 inline" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
} 