"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMixedTest = exports.getRandomQuestions = exports.getQuestionsByDifficulty = exports.getQuestionsByCategory = exports.ENGLISH_QUESTIONS = void 0;
exports.ENGLISH_QUESTIONS = [
    // Original questions from user (cleaned up)
    {
        id: '1',
        question: 'Thanks for your last e-mail! I know you like art, just _____ I do, so I wanted _____ you about the special trip my class went on last week.',
        options: ['tell', 'told', 'to tell', 'telling'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '2',
        question: 'If your family comes to _____ us this year, we can go to the art museum together.',
        options: ['ask', 'visit', 'look', 'return'],
        correctAnswer: 1,
        category: 'vocabulary',
        difficulty: 'easy'
    },
    {
        id: '3',
        question: 'Yet judging by variety of life in it, Lake Victoria _____ a much older body of water.',
        options: ['resembles', 'portrays', 'views', 'likes'],
        correctAnswer: 0,
        category: 'vocabulary',
        difficulty: 'medium'
    },
    {
        id: '4',
        question: '_____ common for new lakes to contain only a small number of species.',
        options: ['Is', 'It is', 'Being', 'Because it is'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '5',
        question: 'There are _____ 500 different species of just this one type of fish.',
        options: ['many', 'as many', 'too many', 'as many as'],
        correctAnswer: 3,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '6',
        question: "It's impossible to do a day's work without _____.",
        options: ['to sleep', 'not to sleep', 'sleeping', 'slept'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '7',
        question: 'This picture _____ by Vermeer.',
        options: ['is painting', 'will paint', 'was painted', 'has painted'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '8',
        question: 'What differences are there _____ the English spoken in the UK and the English spoken in the US?',
        options: ['among', 'between', 'beside', 'with'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '9',
        question: 'At this time tomorrow, I _____ to Canada.',
        options: ['will fly', 'will have been flying', 'will be flying', 'am flying'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'hard'
    },
    {
        id: '10',
        question: 'I had taken the pen before she _____.',
        options: ['did', 'took', 'had taken', 'was taking'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'hard'
    },
    {
        id: '11',
        question: 'Very surprised by the news, all the candidates looked at _____.',
        options: ['themselves', 'one another', 'them', 'each other'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '12',
        question: 'This English book belongs _____ my brother and me.',
        options: ['to', 'at', 'for', 'with'],
        correctAnswer: 0,
        category: 'grammar',
        difficulty: 'easy'
    },
    {
        id: '13',
        question: 'She comes from _____ European country, but I don\'t know which one.',
        options: ['an', 'a', 'the', '(no article)'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '14',
        question: 'The mother _____ the child to the kindergarten, but now she does not.',
        options: ['is taking', 'used to take', 'has taken', 'was taking'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '15',
        question: 'Cinema is the _____.',
        options: ['10th art', 'First art', '7th art', 'Final art'],
        correctAnswer: 2,
        category: 'general',
        difficulty: 'medium'
    },
    {
        id: '16',
        question: 'A slimming diet is meant for:',
        options: ['Kind people', 'Fat people', 'Tall people', 'Slim people'],
        correctAnswer: 1,
        category: 'vocabulary',
        difficulty: 'easy'
    },
    {
        id: '17',
        question: 'The basis of religion is:',
        options: ['Faith', 'Passion', 'Ideology', 'Mythology'],
        correctAnswer: 0,
        category: 'general',
        difficulty: 'easy'
    },
    {
        id: '18',
        question: 'Planes can take off:',
        options: ['Anywhere', 'At the station', 'In the air', 'At the airport'],
        correctAnswer: 3,
        category: 'general',
        difficulty: 'easy'
    },
    {
        id: '19',
        question: 'A mammoth is:',
        options: ['An animal in India', 'An extinct species', 'A huge saurian', 'A type of elephant'],
        correctAnswer: 1,
        category: 'general',
        difficulty: 'medium'
    },
    {
        id: '20',
        question: 'Andy went to the bank for:',
        options: ['Crush', 'Flash', 'Cash', 'Crack'],
        correctAnswer: 2,
        category: 'vocabulary',
        difficulty: 'easy'
    },
    // Additional questions following the same format
    {
        id: '21',
        question: 'If I _____ you, I would study harder for the exam.',
        options: ['am', 'was', 'were', 'will be'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '22',
        question: 'She has been living in Paris _____ five years.',
        options: ['since', 'for', 'during', 'from'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '23',
        question: 'The company _____ a new product next month.',
        options: ['launches', 'will launch', 'is launching', 'has launched'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '24',
        question: 'Neither John _____ Mary came to the party.',
        options: ['or', 'nor', 'and', 'but'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '25',
        question: 'The weather today is _____ than yesterday.',
        options: ['more good', 'better', 'more better', 'best'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'easy'
    },
    {
        id: '26',
        question: 'I wish I _____ speak French fluently.',
        options: ['can', 'could', 'will', 'would'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'hard'
    },
    {
        id: '27',
        question: 'The book _____ on the table is mine.',
        options: ['lying', 'laying', 'lies', 'laid'],
        correctAnswer: 0,
        category: 'grammar',
        difficulty: 'hard'
    },
    {
        id: '28',
        question: 'He denied _____ the money.',
        options: ['to steal', 'stealing', 'steal', 'stole'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '29',
        question: 'A person who studies ancient civilizations is called:',
        options: ['Archaeologist', 'Anthropologist', 'Historian', 'Geologist'],
        correctAnswer: 0,
        category: 'vocabulary',
        difficulty: 'medium'
    },
    {
        id: '30',
        question: 'The opposite of "transparent" is:',
        options: ['Clear', 'Opaque', 'Visible', 'Bright'],
        correctAnswer: 1,
        category: 'vocabulary',
        difficulty: 'medium'
    },
    {
        id: '31',
        question: 'Shakespeare wrote _____ plays and sonnets.',
        options: ['37', '39', '41', '35'],
        correctAnswer: 1,
        category: 'general',
        difficulty: 'hard'
    },
    {
        id: '32',
        question: 'The plural of "child" is:',
        options: ['childs', 'childes', 'children', 'child'],
        correctAnswer: 2,
        category: 'grammar',
        difficulty: 'easy'
    },
    {
        id: '33',
        question: 'Someone who cannot read or write is:',
        options: ['Illiterate', 'Uneducated', 'Ignorant', 'Unlearned'],
        correctAnswer: 0,
        category: 'vocabulary',
        difficulty: 'medium'
    },
    {
        id: '34',
        question: 'The largest English-speaking country by population is:',
        options: ['United Kingdom', 'Canada', 'Australia', 'United States'],
        correctAnswer: 3,
        category: 'general',
        difficulty: 'easy'
    },
    {
        id: '35',
        question: 'By the time you arrive, we _____ dinner.',
        options: ['will finish', 'will have finished', 'are finishing', 'have finished'],
        correctAnswer: 1,
        category: 'grammar',
        difficulty: 'hard'
    },
    {
        id: '36',
        question: 'The correct spelling is:',
        options: ['Recieve', 'Receive', 'Receve', 'Receeve'],
        correctAnswer: 1,
        category: 'vocabulary',
        difficulty: 'medium'
    },
    {
        id: '37',
        question: 'A group of wolves is called:',
        options: ['Herd', 'Pack', 'Flock', 'Pride'],
        correctAnswer: 1,
        category: 'vocabulary',
        difficulty: 'medium'
    },
    {
        id: '38',
        question: 'The novel "1984" was written by:',
        options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'H.G. Wells'],
        correctAnswer: 0,
        category: 'general',
        difficulty: 'medium'
    },
    {
        id: '39',
        question: 'He speaks English _____ fluently than his brother.',
        options: ['more', 'most', 'much', 'many'],
        correctAnswer: 0,
        category: 'grammar',
        difficulty: 'medium'
    },
    {
        id: '40',
        question: 'The meeting has been _____ until next week.',
        options: ['postponed', 'canceled', 'advanced', 'delayed'],
        correctAnswer: 0,
        category: 'vocabulary',
        difficulty: 'medium'
    }
];
// Helper functions for test generation
var getQuestionsByCategory = function (category, count) {
    var filtered = exports.ENGLISH_QUESTIONS.filter(function (q) { return q.category === category; });
    return filtered.slice(0, count);
};
exports.getQuestionsByCategory = getQuestionsByCategory;
var getQuestionsByDifficulty = function (difficulty, count) {
    var filtered = exports.ENGLISH_QUESTIONS.filter(function (q) { return q.difficulty === difficulty; });
    return filtered.slice(0, count);
};
exports.getQuestionsByDifficulty = getQuestionsByDifficulty;
var getRandomQuestions = function (count) {
    var shuffled = __spreadArray([], exports.ENGLISH_QUESTIONS, true).sort(function () { return 0.5 - Math.random(); });
    return shuffled.slice(0, count);
};
exports.getRandomQuestions = getRandomQuestions;
var getMixedTest = function (totalQuestions) {
    var easyCount = Math.floor(totalQuestions * 0.4);
    var mediumCount = Math.floor(totalQuestions * 0.4);
    var hardCount = totalQuestions - easyCount - mediumCount;
    var easy = (0, exports.getQuestionsByDifficulty)('easy', easyCount);
    var medium = (0, exports.getQuestionsByDifficulty)('medium', mediumCount);
    var hard = (0, exports.getQuestionsByDifficulty)('hard', hardCount);
    return __spreadArray(__spreadArray(__spreadArray([], easy, true), medium, true), hard, true).sort(function () { return 0.5 - Math.random(); });
};
exports.getMixedTest = getMixedTest;
