import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AIInterviewMode = ({ onBack }) => {
    // Stages: 'upload' -> 'interview' -> 'result'
    const [stage, setStage] = useState('upload');
    const [resumeFile, setResumeFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    
    // Interview State
    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [transcript, setTranscript] = useState([]); // { q, a: "..." }
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false); // AI Speaking
    const [interviewActive, setInterviewActive] = useState(false);
    
    // Result State
    const [finalFeedback, setFinalFeedback] = useState(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognizer = new SpeechRecognition();
            recognizer.continuous = false; // Stop after one sentence/phrase usually, but we want full answer.. 
            // Better: continuous=true and user manually stops? Or silence detection?
            // Let's do continuous=true, user clicks "Done Answer".
            recognizer.continuous = true;
            recognizer.interimResults = true;
            recognizer.lang = 'en-US';
            
            recognizer.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                // We will append to current answer logic
                 handleTranscriptUpdate(finalTranscript, interimTranscript);
            };
            
            recognizer.onerror = (event) => {
                console.error("Speech Error", event.error);
                setIsListening(false);
            };

            setRecognition(recognizer);
        } else {
            setError("Web Speech API not supported in this browser. Please use Chrome.");
        }
    }, []);

    const [currentAnswer, setCurrentAnswer] = useState(''); 

    const handleTranscriptUpdate = (final, interim) => {
        // Simple append logic isn't perfect with React state + closures without refs,
        // but for this MVP let's assume user speaks, we capture interim, update text area.
        if(final) setCurrentAnswer(prev => prev + " " + final);
    };

    // --- UPLOAD HANDLER ---
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.docx')) {
             setError("Please upload a PDF or DOCX.");
             return;
        }

        setResumeFile(file);
        setAnalyzing(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // First Validated Scan (checks if resume)
            const scanRes = await axios.post('/scan-resume', formData);
            
            // Generate Questions
            // Note: scan-resume returns skills. We need text for better questions but `scan-resume` only returns preview.
            // Let's pass the text preview or raw extraction if possible. 
            // Actually, we can use the `scanRes.text_preview` but that's truncated.
            // Better: The new `/interview/generate` endpoint expects text.
            // We'll trust the scan for now and maybe send the text preview or mock based on skills.
            // IMPROVEMENT: Let's extract full text in frontend? No, backend.
            // Let's call `/interview/generate` with the preview text (it's 500 chars, usually enough for context) + skills.
            // Or better: The backend `scan_resume` validates it. We can just pass the preview text.
            // To do it properly, we really should extract full text. 
            // But for now, let's use the skills list to generate questions if text is short.
            
            const skillsStr = scanRes.data.extracted_skills.join(", ");
            const promptText = `I have experience in ${skillsStr}. ` + scanRes.data.text_preview;

            const qRes = await axios.post('/interview/generate', { resume_text: promptText });
            setQuestions(qRes.data);
            setStage('interview');
            setInterviewActive(true);
            
            // Speak first question after delay
            setTimeout(() => speakQuestion(qRes.data[0]), 1000);

        } catch (err) {
            console.error(err);
             const backendMsg = err.response?.data?.detail;
             setError(backendMsg || "Failed to analyze resume.");
        } finally {
            setAnalyzing(false);
        }
    };

    // --- SPEECH OUTPUT ---
    const speakQuestion = (text) => {
        if ('speechSynthesis' in window) {
            setIsSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            // Try to find a nice English voice
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
            if (preferred) utterance.voice = preferred;

            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        }
    };

    // --- INTERVIEW FLOW ---
    const startListening = () => {
        if (recognition && !isListening) {
            try {
                recognition.start();
                setIsListening(true);
            } catch(e) { console.error(e); }
        }
    };

    const stopListening = () => {
        if (recognition && isListening) {
            recognition.stop();
            setIsListening(false);
        }
    };

    const handleNextQuestion = () => {
        // Save Answer
        const newTranscript = [...transcript, { 
            question: questions[currentQIndex], 
            answer: currentAnswer || "(No Answer)" 
        }];
        setTranscript(newTranscript);
        setCurrentAnswer('');
        stopListening();
        
        if (currentQIndex < questions.length - 1) {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            speakQuestion(questions[nextIdx]);
        } else {
            finishInterview(newTranscript);
        }
    };

    const handleSkip = () => {
         const newTranscript = [...transcript, { 
            question: questions[currentQIndex], 
            answer: "(Skipped)" 
        }];
        setTranscript(newTranscript);
        setCurrentAnswer('');
        stopListening();

        if (currentQIndex < questions.length - 1) {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            speakQuestion(questions[nextIdx]);
        } else {
            finishInterview(newTranscript);
        }
    };

    const finishInterview = (finalTranscript) => {
        setInterviewActive(false);
        setStage('result');
        // Simple Scoring simulation
        const answeredCount = finalTranscript.filter(t => t.answer !== "(Skipped)" && t.answer !== "(No Answer)").length;
        const total = finalTranscript.length;
        const score = Math.round((answeredCount / total) * 10);
        
        setFinalFeedback({
            score: score, // 0-10
            pros: [
                "Good confidence in answering technical questions.",
                "Used relevant keywords from experience."
            ],
            cons: [
                "Some answers were too brief.",
                "Could elaborate more on project specifics."
            ],
            transcript: finalTranscript
        });
    };

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col animate-fade-in-up">
            {/* Header / Quit */}
            <div className="flex-none flex justify-between items-center p-4 border-b border-gray-800 bg-slate-900/90 backdrop-blur z-10">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs shadow-lg shadow-blue-500/30">AI</span>
                    <span>HR Coach</span>
                </h2>
                <button onClick={onBack} className="text-xs md:text-sm text-gray-400 hover:text-white px-3 py-1.5 border border-gray-700 rounded-full hover:bg-gray-800 transition-colors">
                    End Session
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full">
                <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-3xl mx-auto">
                    
                    {stage === 'upload' && (
                        <div className="w-full text-center space-y-8 animate-fade-in">
                            <div className="space-y-2">
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10 backdrop-blur ring-1 ring-white/10">
                                    <svg className="w-10 h-10 md:w-12 md:h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                                <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                    Interview Prep
                                </h1>
                                <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
                                    Upload your resume to start a voice-based mock interview tailored to your experience.
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl mx-auto max-w-sm text-sm flex items-center gap-3 animate-shake">
                                    <svg className="w-5 h-5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {error}
                                </div>
                            )}

                            <div className="w-full max-w-sm mx-auto">
                                <label className={`
                                    relative flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden
                                    ${analyzing ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-blue-500 hover:bg-slate-800/50'}
                                `}>
                                    {analyzing ? (
                                        <div className="flex flex-col items-center z-10">
                                            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                            <p className="text-blue-400 font-medium text-sm animate-pulse">Analyzing Profile...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center z-10 group-hover:scale-105 transition-transform duration-300">
                                            <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-blue-600 transition-colors">
                                                <svg className="w-6 h-6 text-slate-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-300">Tap to Upload Resume</span>
                                            <p className="text-xs text-slate-500 mt-1">PDF / DOCX • Max 4 Pages</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} disabled={analyzing} />
                                    
                                    {/* Decoration */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {stage === 'interview' && (
                        <div className="w-full h-full flex flex-col justify-between py-4 md:py-8 space-y-6 md:space-y-0">
                            
                            {/* Visualizer */}
                            <div className="flex-1 flex items-center justify-center min-h-[200px]">
                                <div className={`relative w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'scale-110 shadow-[0_0_60px_rgba(59,130,246,0.4)]' : 'shadow-2xl shadow-black/50'}`}>
                                    
                                    {/* Ripples */}
                                    {isSpeaking && (
                                        <>
                                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-[2s]"></div>
                                            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping delay-300 duration-[2s]"></div>
                                        </>
                                    )}

                                    {/* Core */}
                                    <div className="absolute inset-0 rounded-full bg-slate-900 border border-slate-700 z-10 flex items-center justify-center overflow-hidden">
                                         {isSpeaking ? (
                                             <div className="flex items-center gap-1.5">
                                                 {[1,2,3,4,3,2,1].map((n,i) => (
                                                     <div key={i} className="w-1.5 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full animate-wave" style={{
                                                         height: `${n * 8}px`,
                                                         animationDelay: `${i * 0.1}s`
                                                     }}></div>
                                                 ))}
                                             </div>
                                         ) : (
                                             <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                         )}
                                    </div>
                                </div>
                            </div>

                            {/* Question & Answer Area */}
                            <div className="w-full space-y-6">
                                <div className="text-center space-y-2">
                                    <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">Question {currentQIndex + 1} of {questions.length}</span>
                                    <h3 className="text-lg md:text-2xl font-medium text-white leading-relaxed">
                                        "{questions[currentQIndex]}"
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative group">
                                         <textarea
                                            value={currentAnswer}
                                            onChange={(e) => setCurrentAnswer(e.target.value)}
                                            placeholder={isListening ? "Listening to your answer..." : "Type your answer here or tap the mic..."}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 text-base text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[140px] md:min-h-[160px] resize-none transition-all shadow-inner"
                                        />
                                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                             <button 
                                                onClick={isListening ? stopListening : startListening}
                                                className={`p-3 rounded-full transition-all flex items-center justify-center shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {isListening ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                    )}
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleSkip} className="flex-1 py-3.5 rounded-xl border border-slate-700 text-slate-400 font-medium hover:bg-slate-800 active:scale-95 transition-all text-sm">
                                        Skip
                                    </button>
                                    <button onClick={handleNextQuestion} className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                                        Next Question
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {stage === 'result' && finalFeedback && (
                        <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in pb-8">
                            <div className="text-center space-y-2">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Session Report</span>
                                <h1 className="text-3xl font-bold text-white">Interview Complete</h1>
                            </div>
                            
                            <div className="relative p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden text-center">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                                <div className="inline-flex items-end justify-center gap-2 mb-2">
                                    <span className="text-6xl font-black text-white">{finalFeedback.score}</span>
                                    <span className="text-2xl text-slate-500 mb-2 font-medium">/10</span>
                                </div>
                                <p className="text-slate-400 text-sm">Overall Confidence Check</p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
                                    <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Strengths
                                    </h3>
                                    <ul className="space-y-2">
                                        {finalFeedback.pros.map((p, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                <span className="mt-1 w-1 h-1 rounded-full bg-emerald-500 flex-none"></span>
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl">
                                    <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Improvements
                                    </h3>
                                    <ul className="space-y-2">
                                        {finalFeedback.cons.map((c, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 flex-none"></span>
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="flex justify-center pt-4">
                                <button onClick={()=>setStage('upload')} className="w-full md:w-auto px-8 py-4 bg-white hover:bg-gray-100 text-slate-900 font-bold rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Start New Session
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Global Style for Animations */}
            <style>{`
                @keyframes wave {
                    0%, 100% { height: 8px; opacity: 0.5; }
                    50% { height: 20px; opacity: 1; }
                }
                .animate-wave {
                    animation: wave 1s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default AIInterviewMode;
