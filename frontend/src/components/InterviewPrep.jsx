import React, { useState } from 'react';

// --- QUESTION BANKS ---

const TECH_QUESTIONS = [
    {
        type: "System Design",
        text: "In a distributed system, what does the CAP theorem assert you must choose between during a partition?",
        options: ["Consistency and Availability", "Consistency and Performance", "Availability and Latency", "Performance and Durability"],
        correctAnswer: 0,
        hint: "P stands for Partition Tolerance, which is unavoidable. You pick C or A."
    },
    {
        type: "JavaScript",
        text: "What is the purpose of a 'Closure' in JavaScript?",
        options: [
            "To secure variables from the global scope.",
            "To allow a function to access variables from an outer function that has already returned.",
            "To close the browser window.",
            "To optimize memory usage by deleting variables."
        ],
        correctAnswer: 1,
        hint: "It's about memory memory retention of the lexical scope."
    },
    {
        type: "Databases",
        text: "What is 'Normalization' principally used for in a relational database?",
        options: [
            "To increase read speed.",
            "To reduce data redundancy and improve integrity.",
            "To create backups.",
            "To encrypt sensitive data."
        ],
        correctAnswer: 1,
        hint: "It involves dividing large tables into smaller, related tables."
    },
    {
        type: "React",
        text: "Why should you never modify `this.state` directly in a class component?",
        options: [
            "It will throw a syntax error.",
            "It won't trigger a re-render.",
            "It will crash the browser.",
            "It violates security protocols."
        ],
        correctAnswer: 1,
        hint: "React needs to know state changed to update the DOM."
    },
    {
        type: "Network",
        text: "What is the function of DNS?",
        options: [
            "To encrypt traffic.",
            "To translate domain names (google.com) into IP addresses.",
            "To assign IP addresses to devices.",
            "To firewall the network."
        ],
        correctAnswer: 1,
        hint: "It's the phonebook of the internet."
    },
    {
        type: "Python",
        text: "What acts as a constructor in a Python class?",
        options: ["def construct(self):", "def __init__(self):", "class Name():", "def build(self):"],
        correctAnswer: 1,
        hint: "Double underscore methods are special in Python."
    },
    {
        type: "DevOps",
        text: "What is the main benefit of using Docker containers?",
        options: [
            "They replace the need for an OS.",
            "Consistency across environments (Works on my machine = Works in Prod).",
            "They make the internet faster.",
            "They automatically fix code bugs."
        ],
        correctAnswer: 1,
        hint: "No more 'it works on my laptop' excuses."
    },
    {
        type: "Algorithms",
        text: "Which data structure follows the LIFO (Last In First Out) principle?",
        options: ["Queue", "Array", "Stack", "Linked List"],
        correctAnswer: 2,
        hint: "Like a stack of plates."
    },
    {
        type: "Security",
        text: "What is Cross-Site Scripting (XSS)?",
        options: [
            "Injecting malicious scripts into trusted websites viewed by other users.",
            "Stealing a server's database.",
            "Cracking passwords using a dictionary attack.",
            "Sending spam emails."
        ],
        correctAnswer: 0,
        hint: "It happens on the client-side (browser)."
    },
    {
        type: "Testing",
        text: "What is the goal of Unit Testing?",
        options: [
            "To test the whole system end-to-end.",
            "To test individual components or functions in isolation.",
            "To check user acceptance.",
            "To load test the server."
        ],
        correctAnswer: 1,
        hint: "Testing the smallest testable parts."
    },
    {
        type: "React",
        text: "What is the virtual DOM?",
        options: [
            "A direct copy of the browser DOM.",
            "A lightweight in-memory representation of the DOM used for diffing.",
            "A 3D visualization of the UI.",
            "A plugin for Chrome."
        ],
        correctAnswer: 1,
        hint: "It minimizes direct manipulation of the slow real DOM."
    },
    {
        type: "CSS",
        text: "Which value of `position` takes the element out of the document flow?",
        options: ["relative", "static", "absolute", "sticky"],
        correctAnswer: 2,
        hint: "Fixed does too, but absolute is the common answer here."
    },
    {
        type: "Technical",
        text: "Which of the following is a primary difference between SQL and NoSQL databases?",
        options: [
            "SQL databases are vertically scalable, while NoSQL are horizontally scalable.",
            "SQL databases do not support transactions.",
            "NoSQL databases require a predefined schema.",
            "SQL databases are unstructured."
        ],
        correctAnswer: 0,
        hint: "Think about scaling: adding more power (CPU/RAM) vs adding more servers."
    },
    {
        type: "React",
        text: "In React, what constitutes the 'One-Way Data Flow'?",
        options: [
            "Data flows from Child to Parent via Props.",
            "Data flows from Parent to Child via Props.",
            "Data flows bi-directionally automatically.",
            "Data is stored globally by default."
        ],
        correctAnswer: 1,
        hint: "Props are read-only and passed down the component tree."
    },
    {
        type: "JavaScript",
        text: "What is the output of `console.log(typeof NaN)`?",
        options: ["'number'", "'NaN'", "'undefined'", "'object'"],
        correctAnswer: 0,
        hint: "NaN stands for Not-a-Number, but technically it belongs to a numeric type."
    },
    {
        type: "Technical",
        text: "Which HTTP method is idempotent and used to update an existing resource?",
        options: ["POST", "PUT", "DELETE", "GET"],
        correctAnswer: 1,
        hint: "It replaces the resource entirely. Running it multiple times has the same effect."
    },
    {
        type: "Python",
        text: "Which keyword is used to handle exceptions in Python?",
        options: ["catch", "rescue", "except", "error"],
        correctAnswer: 2,
        hint: "Used in try-... blocks."
    },
    {
        type: "Git",
        text: "Which command is used to stash changes in a dirty working directory?",
        options: ["git stash", "git save", "git hide", "git commit"],
        correctAnswer: 0,
        hint: "Useful for switching branches without committing half-done work."
    },
    {
        type: "CSS",
        text: "Which CSS property is used to change the text color of an element?",
        options: ["text-color", "font-color", "color", "background-color"],
        correctAnswer: 2,
        hint: "It's the simplest property name."
    },
    {
        type: "HTML",
        text: "Which semantic tag is best for the main navigation menu?",
        options: ["<menu>", "<nav>", "<div>", "<section>"],
        correctAnswer: 1,
        hint: "Short for 'navigation'."
    },
    {
        type: "Security",
        text: "What does SQL Injection target?",
        options: [
             "The frontend logic.",
             "The database layer.",
             "The CSS styles.",
             "The browser cache."
        ],
        correctAnswer: 1,
        hint: "It manipulates queries."
    },
    {
        type: "Data Structures",
        text: "What is the time complexity of looking up a value in a Hash Map?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
        correctAnswer: 2,
        hint: "It's constant time on average."
    },
    {
        type: "General",
        text: "What does CI/CD stand for?",
        options: [
            "Code Integration / Code Deployment",
            "Continuous Integration / Continuous Deployment",
            "Computer Interface / Computer Design",
            "Customer Interaction / Customer Delivery"
        ],
        correctAnswer: 1,
        hint: "Automated pipelines."
    }
];

const APTITUDE_QUESTIONS = [
    {
        type: "Logic",
        text: "Look at this series: 7, 10, 8, 11, 9, 12, ... What number should come next?",
        options: ["7", "10", "12", "13"],
        correctAnswer: 1,
        hint: "It's an alternating series: 7->8->9->10. Interleaved with 10->11->12."
    },
    {
        type: "Math",
        text: "A shopkeeper sells a bag at a 20% profit. If he had sold it for $20 less, he would have made a 10% profit. What is the cost price?",
        options: ["$150", "$200", "$250", "$300"],
        correctAnswer: 1,
        hint: "Diff of 10% (20% - 10%) = $20. So 1% = $2, 100% = $200."
    },
    {
        type: "Logic",
        text: "Statement: 'If you work hard, you will succeed.' Conclusion: 'If you don't work hard, you won't succeed.'",
        options: ["True", "False (Logic Error)", "Probably True", "Irrelevant"],
        correctAnswer: 1,
        hint: "This is the 'Inverse Error'. You might succeed by luck! The statement only guarantees success for hard work, not failure for laziness."
    },
    {
        type: "Verbal",
        text: "Select the word that is opposite in meaning to 'OBSOLETE'.",
        options: ["Rare", "Useless", "Contemporary", "Old"],
        correctAnswer: 2,
        hint: "Contemporary means modern or current."
    },
    {
        type: "Probability",
        text: "Two coins are tossed. What is the probability of getting at least one head?",
        options: ["1/4", "1/2", "3/4", "1"],
        correctAnswer: 2,
        hint: "Options are HH, HT, TH, TT. Only TT has no heads. So 3 out of 4."
    },
    {
        type: "Lateral",
        text: "A man pushes his car to a hotel and tells the owner he's bankrupt. Why?",
        options: [
            "He crashed the car.",
            "He is playing Monopoly.",
            "The hotel is expensive.",
            "It's a robbery."
        ],
        correctAnswer: 1,
        hint: "It's a classic board game scenario."
    },
    {
        type: "Logic",
        text: "Choose the odd one out: Copper, Zinc, Brass, Aluminium.",
        options: ["Copper", "Zinc", "Brass", "Aluminium"],
        correctAnswer: 2,
        hint: "Brass is an alloy (mixture), the others are pure elements."
    },
    {
        type: "Math",
        text: "If 5 cats catch 5 mice in 5 minutes, how many cats are needed to catch 100 mice in 100 minutes?",
        options: ["100", "5", "20", "50"],
        correctAnswer: 1,
        hint: "1 cat catches 1 mouse in 5 minutes. In 100 mins, 1 cat catches 20 mice. To catch 100 mice, you need 5 cats."
    },
    {
        type: "Logic",
        text: "Identify the next number in the series: 2, 6, 12, 20, 30, ...",
        options: ["40", "42", "44", "46"],
        correctAnswer: 1,
        hint: "Differences are 4, 6, 8, 10... so next is +12."
    },
    {
        type: "Logic",
        text: "If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?",
        options: ["Brother", "Sister", "Nephew/Niece", "Uncle"],
        correctAnswer: 2,
        hint: "A is C's brother. D is C's child."
    },
    {
        type: "Math",
        text: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
        options: ["120 metres", "180 metres", "324 metres", "150 metres"],
        correctAnswer: 3,
        hint: "Distance = Speed × Time. Convert km/hr to m/s (60 * 5/18)."
    },
    {
        type: "Math",
        text: "The average of first 50 natural numbers is?",
        options: ["25.30", "25.5", "25.00", "12.25"],
        correctAnswer: 1,
        hint: "Sum of n natural numbers = n(n+1)/2. Average = (n+1)/2."
    },
    {
        type: "Verbal",
        text: "Synonym of 'CANDID' is:",
        options: ["Apparent", "Explicit", "Frank", "Bright"],
        correctAnswer: 2,
        hint: "It means truthful and straightforward."
    },
    {
        type: "Logic",
        text: "In a certain code language, 'COMPUTER' is written as 'RFUVQNPC'. How will 'MEDICINE' be written in that code?",
        options: ["EOJDJEFM", "EOJDEJFM", "MFEJDJOE", "EOJDJMFE"],
        correctAnswer: 0,
        hint: "Reverse the word and write next/previous letters."
    },
    {
        type: "Probability",
        text: "Tickets numbered 1 to 20 are mixed up and then a ticket is drawn at random. What is the probability that the ticket drawn has a number which is a multiple of 3 or 5?",
        options: ["1/2", "2/5", "8/15", "9/20"],
        correctAnswer: 3,
        hint: "Multiples of 3: 3,6,9,12,15,18 (6). Multiples of 5: 5,10,15,20 (4). Common (15) counted twice. Total = 6+4-1 = 9."
    },
    {
        type: "Logic",
        text: "Statements: Some actors are singers. All the singers are dancers. Conclusion: Some actors are dancers.",
        options: ["True", "False", "Cannot be determined", "None of these"],
        correctAnswer: 0,
        hint: "Draw a Venn diagram."
    },
    {
        type: "Math",
        text: "A fruit seller had some apples. He sells 40% apples and still has 420 apples. Originally, he had:",
        options: ["588 apples", "600 apples", "672 apples", "700 apples"],
        correctAnswer: 3,
        hint: "60% = 420. So 100% = 420/0.6."
    },
    {
        type: "Math",
        text: "What is 20% of 30% of 500?",
        options: ["20", "30", "50", "300"],
        correctAnswer: 1,
        hint: "0.2 * 0.3 * 500."
    }
];

const InterviewPrep = () => {
    const [mode, setMode] = useState(null); 
    const [started, setStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); 
    const [showResult, setShowResult] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [questionCount, setQuestionCount] = useState(5);
    
    // Track seen questions (indices) to avoid repetition within session 
    const [history, setHistory] = useState({
        technical: [],
        aptitude: []
    });

    const startQuiz = (selectedMode) => {
        const fullBank = selectedMode === 'technical' ? TECH_QUESTIONS : APTITUDE_QUESTIONS;
        const usedIndices = history[selectedMode];
        
        // Find available indices
        let availableIndices = fullBank.map((_, i) => i).filter(i => !usedIndices.includes(i));
        
        // If not enough questions even for 1, reset history
        if (availableIndices.length < questionCount) {
             availableIndices = fullBank.map((_, i) => i);
             // Reset logic: clear only current mode history
             setHistory(prev => ({ ...prev, [selectedMode]: [] }));
        }

        const shuffledIndices = availableIndices.sort(() => 0.5 - Math.random());
        const selectedIndices = shuffledIndices.slice(0, Math.min(questionCount, fullBank.length));
        
        const batch = selectedIndices.map(i => fullBank[i]);
        
        // Update history
        setHistory(prev => ({
            ...prev,
            [selectedMode]: [...(availableIndices.length === fullBank.length ? [] : prev[selectedMode]), ...selectedIndices]
        }));

        setQuizQuestions(batch);
        setStarted(true);
        setCurrentQuestion(0);
        setUserAnswers({});
        setShowResult(false);
    };

    const handleOptionSelect = (optionIndex) => {
        setUserAnswers({
            ...userAnswers,
            [currentQuestion]: optionIndex
        });
    };

    const calculateScore = () => {
        let score = 0;
        quizQuestions.forEach((q, index) => {
            if (userAnswers[index] === q.correctAnswer) {
                score += 1;
            }
        });
        return score;
    };

    const handleFinish = () => {
        setShowResult(true);
    };

    const restartSession = () => {
        setStarted(false);
        setShowResult(false);
        setUserAnswers({});
        setCurrentQuestion(0);
        setMode(null); 
    };

    // --- RENDER: MODE SELECTION ---
    if (!mode) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 text-center animate-fade-in-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Interview Prep Hub</h2>
                <p className="text-lg md:text-xl text-gray-300 mb-8 md:mb-12 max-w-2xl mx-auto">
                    Select a track to begin your preparation. Questions are randomized and non-repetitive in each session.
                </p>

                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    {/* Technical Card */}
                    <div 
                        onClick={() => setMode('technical')}
                        className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:bg-gray-800/80 group shadow-lg hover:shadow-blue-500/20"
                    >
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 md:w-10 md:h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Technical Interview</h3>
                        <p className="text-sm md:text-base text-gray-400">
                            Master concepts in React, Python, and System Design.
                        </p>
                    </div>

                    {/* Aptitude Card */}
                    <div 
                        onClick={() => setMode('aptitude')}
                        className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-700 hover:border-purple-500 cursor-pointer transition-all hover:bg-gray-800/80 group shadow-lg hover:shadow-purple-500/20"
                    >
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 md:w-10 md:h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Aptitude & Logic</h3>
                        <p className="text-sm md:text-base text-gray-400">
                            Sharpen skills with math, logic, and puzzles.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: START SCREEN (for selected mode) ---
    if (!started) {
        const isTech = mode === 'technical';
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 text-center animate-fade-in-up">
                <div className="w-full text-left mb-6">
                    <button 
                        onClick={() => setMode(null)}
                        className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors py-2"
                    >
                        ← Back to Tracks
                    </button>
                </div>

                <div className="mb-6 md:mb-8 flex justify-center">
                    <div className={`w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br ${isTech ? 'from-blue-500 to-cyan-500 shadow-blue-500/30' : 'from-purple-500 to-pink-500 shadow-purple-500/30'} rounded-full flex items-center justify-center shadow-lg`}>
                        {isTech ? (
                            <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        ) : (
                            <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        )}
                    </div>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-white">
                    {isTech ? 'Technical Assessment' : 'Aptitude & Logic Quiz'}
                </h2>
                <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto px-2">
                    {isTech 
                        ? "Test your knowledge on React, Python, Databases, and System Design." 
                        : "Challenge yourself with logical reasoning, quantitative aptitude, and puzzles."}
                </p>

                {/* Question Count Selector */}
                <div className="mb-8 md:mb-12 flex flex-wrap justify-center gap-3">
                    {[5, 10, 15, 20].map(count => (
                        <button
                            key={count}
                            onClick={() => setQuestionCount(count)}
                            className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold border-2 transition-all text-sm md:text-base flex-1 sm:flex-none min-w-[100px]
                                ${questionCount === count 
                                    ? `bg-${isTech ? 'blue' : 'purple'}-600 border-${isTech ? 'blue' : 'purple'}-600 text-white shadow-lg scale-105` 
                                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}
                        >
                            {count} Qs
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => startQuiz(mode)}
                    className={`w-full md:w-auto px-8 py-4 bg-gradient-to-r ${isTech ? 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500' : 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white font-bold rounded-xl text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95`}
                >
                    Start {isTech ? 'Coding' : 'Logic'} Quiz
                </button>
            </div>
        );
    }

    // --- RENDER: RESULT SCREEN ---
    if (showResult) {
        const score = calculateScore();
        const percentage = (score / quizQuestions.length) * 100;
        const isTech = mode === 'technical';
        const passed = percentage >= 60;

        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
                
                {/* HERO SCORE CARD */}
                <div className="relative mb-12">
                     <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-[60px] rounded-full -z-10"></div>
                     <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden relative">
                         <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${passed ? 'from-green-500 to-emerald-500' : 'from-red-500 to-orange-500'}`}></div>

                        {/* LEFT: CHART */}
                        <div className="relative flex-shrink-0">
                            <svg className="w-56 h-56 transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                <circle className="text-gray-800" strokeWidth="16" stroke="currentColor" fill="transparent" r="90" cx="112" cy="112" />
                                <circle 
                                    className={`${passed ? 'text-green-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                    strokeWidth="16"
                                    strokeDasharray={565}
                                    strokeDashoffset={565 - (565 * percentage) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent" 
                                    r="90" cx="112" cy="112" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-6xl font-black ${passed ? 'text-white' : 'text-red-100'}`}>{score}/{quizQuestions.length}</span>
                                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Score</span>
                            </div>
                        </div>

                        {/* RIGHT: TEXT & ACTIONS */}
                        <div className="text-center md:text-left flex-1 space-y-6">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                    {passed ? "Excellent Work! 🚀" : "Keep Practicing! 💪"}
                                </h2>
                                <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
                                    {passed 
                                        ? "You demonstrated strong understanding of the core concepts. You're ready for the next level."
                                        : "Don't worry, every expert was once a beginner. Review your incorrect answers below and try again."}
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 md:justify-start justify-center">
                                <button 
                                    onClick={() => {
                                        setShowResult(false);
                                        setUserAnswers({});
                                        setCurrentQuestion(0);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Retry Quiz
                                </button>
                                <button 
                                    onClick={restartSession}
                                    className="px-8 py-4 bg-gray-800 text-white border border-gray-700 font-bold rounded-xl hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Switch Track
                                </button>
                            </div>
                        </div>
                     </div>
                </div>

                {/* DETAILED RESULTS SECTION */}
                <div className="space-y-8">
                     <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold text-white">Performance Review</h3>
                        <div className="h-px bg-gray-800 flex-1"></div>
                     </div>

                    <div className="space-y-6">
                        {quizQuestions.map((q, index) => {
                            const isCorrect = userAnswers[index] === q.correctAnswer;
                            const userAnswerText = q.options[userAnswers[index]];
                            const correctAnswerText = q.options[q.correctAnswer];

                            return (
                                <div key={index} className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl group
                                    ${isCorrect 
                                        ? 'bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20 hover:border-green-500/40' 
                                        : 'bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20 hover:border-red-500/40'}`}
                                >
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <div className="flex gap-3">
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                                                ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                            >
                                                {index + 1}
                                            </span>
                                            <h4 className="text-base font-semibold text-gray-200 leading-snug">{q.text}</h4>
                                        </div>
                                        {isCorrect ? (
                                             <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                             <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        )}
                                    </div>

                                    <div className="space-y-3 mt-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 group-hover:border-gray-700 transition-colors">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Your Answer</span>
                                            <span className={`font-medium ${isCorrect ? 'text-green-300' : 'text-red-300 line-through decoration-red-500/50'}`}>
                                                {userAnswerText || "Skipped"}
                                            </span>
                                        </div>
                                        
                                        {!isCorrect && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Correct Answer</span>
                                                <span className="text-green-400 font-medium">
                                                    {correctAnswerText}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-start gap-2 text-sm text-gray-400">
                                         <svg className="w-5 h-5 text-yellow-500/70 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                         <p>{q.hint}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: QUIZ RUNNING ---
    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={restartSession}
                    className="text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-1 transition-colors px-2 py-1 hover:bg-red-500/10 rounded-lg"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Quit Quiz
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 mb-6 md:mb-8">
                <h3 className="text-gray-400 uppercase tracking-wider text-xs md:text-sm font-semibold">Question {currentQuestion + 1} of {quizQuestions.length}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border ${mode === 'technical' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-purple-500 text-purple-400 bg-purple-500/10'}`}>
                    {quizQuestions[currentQuestion].type}
                </span>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 md:p-8 shadow-2xl mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
                    {quizQuestions[currentQuestion].text}
                </h2>
                
                <div className="space-y-3 md:space-y-4">
                    {quizQuestions[currentQuestion].options.map((option, index) => (
                        <div 
                            key={index}
                            onClick={() => handleOptionSelect(index)}
                            className={`flex items-start md:items-center p-3 md:p-4 rounded-xl border cursor-pointer transition-all group active:scale-[0.98]
                                ${userAnswers[currentQuestion] === index 
                                    ? (mode === 'technical' ? 'border-blue-500 bg-blue-500/20' : 'border-purple-500 bg-purple-500/20')
                                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-700/50'}`}
                        >
                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center mr-3 md:mr-4 mt-0.5 md:mt-0 flex-shrink-0 transition-colors
                                ${userAnswers[currentQuestion] === index 
                                    ? (mode === 'technical' ? 'border-blue-500' : 'border-purple-500')
                                    : 'border-gray-500 group-hover:border-gray-400'}`}>
                                {userAnswers[currentQuestion] === index && (
                                    <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${mode === 'technical' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                )}
                            </div>
                            <span className={`text-base md:text-lg ${userAnswers[currentQuestion] === index ? 'text-white' : 'text-gray-300'}`}>
                                {option}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex justify-center items-center gap-2 flex-wrap">
                    {quizQuestions.map((_, idx) => {
                        const isAnswered = answers[idx] !== undefined;
                        const isCurrent = currentQuestion === idx;
                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentQuestion(idx)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2
                                    ${isCurrent ? 'scale-110 shadow-lg ring-2 ring-blue-500/50' : ''}
                                    ${isAnswered 
                                        ? 'bg-green-500 border-green-600 text-white' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                    }
                                `}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex gap-4">
                 <button 
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="flex-1 py-3 rounded-xl font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                >
                    Previous
                </button>
                
                {currentQuestion < quizQuestions.length - 1 ? (
                    <button 
                        onClick={() => setCurrentQuestion(currentQuestion + 1)}
                        className={`flex-[2] py-3 rounded-xl font-bold bg-${mode === 'technical' ? 'blue' : 'purple'}-600 hover:bg-${mode === 'technical' ? 'blue' : 'purple'}-500 text-white shadow-lg transition-all text-sm md:text-base active:scale-95`}
                    >
                        Next Question
                    </button>
                ) : (
                    <button 
                        onClick={handleFinish}
                        disabled={Object.keys(userAnswers).length < quizQuestions.length}
                        className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all text-sm md:text-base active:scale-95
                            ${Object.keys(userAnswers).length < quizQuestions.length 
                                ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                                : 'bg-green-600 hover:bg-green-500 shadow-green-500/20'}`}
                    >
                        {Object.keys(userAnswers).length < quizQuestions.length ? 'Answer All to Finish' : 'Finish & See Score'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InterviewPrep;
