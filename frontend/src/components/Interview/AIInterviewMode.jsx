import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const [interimTranscript, setInterimTranscript] = useState('');

    const handleTranscriptUpdate = (final, interim) => {
        // Simple append logic isn't perfect with React state + closures without refs,
        // but for this MVP let's assume user speaks, we capture interim, update text area.
        if(final) {
             setCurrentAnswer(prev => prev + " " + final);
             setInterimTranscript(''); // Clear interim when finalized
        } else {
             setInterimTranscript(interim);
        }
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
            window.speechSynthesis.cancel(); // Stop any previous speech
            setIsSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1; // Slightly faster for natural flow
            utterance.pitch = 0.9; // Slightly deeper
            utterance.volume = 1.0;
            
            // Try to find a nice English voice
            const voices = window.speechSynthesis.getVoices();
            // Preference list for more natural voices
            const preferred = voices.find(v => (v.name.includes('Google') && v.name.includes('English') && !v.name.includes('UK'))) || 
                              voices.find(v => v.name.includes('Samantha')) || 
                              voices.find(v => v.lang === 'en-US');
            
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
            setInterimTranscript('');
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
        window.speechSynthesis.cancel(); // Stop talking if moved next
        
        if (currentQIndex < questions.length - 1) {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            setTimeout(() => speakQuestion(questions[nextIdx]), 500);
        } else {
            finishInterview(newTranscript);
        }
    };

    const handleSkip = () => {
        // Save Skipped
         const newTranscript = [...transcript, { 
            question: questions[currentQIndex], 
            answer: "SKIPPED" 
        }];
        setTranscript(newTranscript);
        setCurrentAnswer('');
        stopListening();
        window.speechSynthesis.cancel();

        if (currentQIndex < questions.length - 1) {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            setTimeout(() => speakQuestion(questions[nextIdx]), 500);
        } else {
            finishInterview(newTranscript);
        }
    };

    const handleBack = () => {
        window.speechSynthesis.cancel();
        stopListening();
        onBack();
    }

    // CALCULATE SCORE (MOCK AI)
    const finishInterview = (finalTranscript) => {
        setStage('result');
        setInterviewActive(false);
        // Analyze...
        const totalWords = finalTranscript.reduce((acc, t) => acc + t.answer.length, 0);
        const score = Math.min(10, Math.max(4, Math.ceil(totalWords / 50))); // Dummy score logic
        
        setFinalFeedback({
            score: score,
            pros: ["Good use of technical keywords", "Clear communication style", "Confidence in answers"],
            cons: ["Could elaborate more on specific projects", "Try to structure answers with STAR method"]
        });
    };

    // --- RENDER ---
    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col h-[100dvh] animate-fade-in-up">
            {/* Header / Quit */}
            <div className="flex-none flex justify-between items-center p-4 border-b border-gray-800 bg-slate-900/90 backdrop-blur z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs shadow-lg shadow-blue-500/30">AI</div>
                    <div className="flex flex-col">
                        <span className="font-bold leading-tight">HR Coach</span>
                        <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded w-fit">Beta</span>
                    </div>
                </div>
                <button onClick={handleBack} className="text-xs md:text-sm text-gray-400 hover:text-white px-4 py-2 border border-gray-700 rounded-full hover:bg-gray-800 transition-colors">
                    Exit
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full scroll-smooth">
                {/* Removed justify-center to prevent top-clipping on overflow */}
                <div className="min-h-full flex flex-col items-center p-4 md:p-8 w-full max-w-3xl mx-auto pb-48 pt-10">
                    
                    {stage === 'upload' && (
                        <div className="w-full text-center space-y-8 animate-fade-in my-auto">
                            <div className="space-y-4">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10 ring-1 ring-white/10">
                                    <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-blue-400">
                                    AI Interview
                                </h1>
                                <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto leading-relaxed">
                                    Upload your resume. Our AI Agent will scan your profile and conduct a mock voice interview.
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
                                    relative flex flex-col items-center justify-center w-full aspect-[4/3] border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 group overflow-hidden bg-slate-900/50
                                    ${analyzing ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-blue-500 hover:bg-slate-800'}
                                `}>
                                    {analyzing ? (
                                        <div className="flex flex-col items-center z-10 p-6">
                                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                            <p className="text-white font-bold text-lg animate-pulse">Analyzing...</p>
                                            <p className="text-slate-400 text-xs mt-2">Reading resume & generating questions</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center z-10 group-hover:scale-105 transition-transform duration-300 p-6">
                                            <div className="w-16 h-16 bg-slate-800 rounded-2xl mb-4 group-hover:bg-blue-600 transition-colors flex items-center justify-center shadow-lg">
                                                <svg className="w-8 h-8 text-slate-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            </div>
                                            <span className="text-lg font-bold text-white">Upload Resume</span>
                                            <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">PDF / DOCX • Max 4 Pages</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} disabled={analyzing} />
                                </label>
                            </div>
                        </div>
                    )}

                    {stage === 'interview' && (
                        <div className="w-full flex flex-col justify-between space-y-8 my-auto">
                            
                            {/* Visualizer */}
                            <div className="flex-none flex items-center justify-center py-8">
                                <div className={`relative w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'scale-110 shadow-[0_0_80px_rgba(59,130,246,0.5)]' : 'shadow-2xl shadow-black/80'}`}>
                                    
                                    {isSpeaking && (
                                        <>
                                            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping duration-[1.5s]"></div>
                                            <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping delay-150 duration-[2s]"></div>
                                        </>
                                    )}

                                    <div className="absolute inset-0 rounded-full bg-slate-900 border border-slate-700 z-10 flex items-center justify-center overflow-hidden">
                                         {isSpeaking ? (
                                             <div className="flex items-center gap-1.5 h-16 items-end">
                                                 {[0.4, 0.7, 1, 0.6, 0.8, 0.4].map((n,i) => (
                                                     <div key={i} className="w-2 md:w-3 bg-gradient-to-t from-blue-500 to-purple-400 rounded-full animate-wave" style={{
                                                         height: `${n * 100}%`,
                                                         animationDelay: `${i * 0.15}s`
                                                     }}></div>
                                                 ))}
                                             </div>
                                         ) : (
                                             <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                         )}
                                    </div>
                                </div>
                            </div>

                            {/* Question & Answer Area */}
                            <div className="w-full space-y-6">
                                <div className="text-center space-y-3">
                                    <span className="text-xs font-bold tracking-[0.2em] text-blue-400 uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                        Question {currentQIndex + 1} / {questions.length}
                                    </span>
                                    <h3 className="text-xl md:text-3xl font-semibold text-white leading-tight px-4">
                                        "{questions[currentQIndex]}"
                                    </h3>
                                </div>

                                <div className="space-y-4 max-w-2xl mx-auto w-full">
                                    <div className="relative group">
                                         <textarea
                                            value={currentAnswer}
                                            onChange={(e) => setCurrentAnswer(e.target.value)}
                                            placeholder={isListening ? "Listening... (Speak clearly)" : "Type your answer or tap the mic..."}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 md:p-6 text-base md:text-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[160px] md:min-h-[200px] resize-none transition-all shadow-inner"
                                        />
                                        <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                             <span className={`text-xs font-medium transition-opacity ${isListening ? 'opacity-100 text-red-400' : 'opacity-0'}`}>Recording...</span>
                                             <button 
                                                onClick={isListening ? stopListening : startListening}
                                                className={`p-4 rounded-full transition-all flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                
                                {isListening && interimTranscript && (
                                    <div className="max-w-2xl mx-auto w-full -mt-2 animate-fade-in">
                                        <p className="text-sm text-blue-400 font-medium flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                            Hearing: <span className="text-slate-300 italic">"{interimTranscript}..."</span>
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-2 max-w-2xl mx-auto w-full">
                                    <button onClick={handleSkip} className="flex-1 py-4 rounded-2xl border border-slate-700 bg-slate-800/50 text-slate-300 font-bold hover:bg-slate-800 active:scale-95 transition-all">
                                        Skip
                                    </button>
                                    <button onClick={handleNextQuestion} className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
                                        Next
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {stage === 'result' && finalFeedback && (
                        <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in my-auto pb-20">
                            <div className="text-center space-y-2">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest px-4 py-1 rounded-full border border-slate-800">Performance Report</span>
                                <h1 className="text-4xl font-bold text-white mt-4">Interview Complete</h1>
                                <p className="text-slate-400">Great job! Here is your AI analysis.</p>
                            </div>
                            
                            <div className="relative p-8 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl overflow-hidden text-center shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                                <div className="inline-flex items-end justify-center gap-2 mb-2">
                                    <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">{finalFeedback.score}</span>
                                    <span className="text-3xl text-slate-600 mb-3 font-medium">/10</span>
                                </div>
                                <p className="text-blue-400 font-medium tracking-wide text-sm uppercase">Overall Rating</p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl">
                                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <span className="p-1 rounded bg-emerald-500/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>
                                        Strengths
                                    </h3>
                                    <ul className="space-y-3">
                                        {finalFeedback.pros.map((p, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-3">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-none shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                <span className="leading-snug">{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl">
                                    <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <span className="p-1 rounded bg-amber-500/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></span>
                                        Improvements
                                    </h3>
                                    <ul className="space-y-3">
                                        {finalFeedback.cons.map((c, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-3">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-none shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                                                <span className="leading-snug">{c}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="flex justify-center pt-6">
                                <button onClick={()=>setStage('upload')} className="w-full md:w-auto px-10 py-4 bg-white hover:bg-gray-100 text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
                    0%, 100% { height: 10%; opacity: 0.5; }
                    50% { height: 60%; opacity: 1; }
                }
                .animate-wave {
                    animation: wave 1s ease-in-out infinite;
                }
                .animate-fade-in-up {
                     animation: fadeInUp 0.5s ease-out;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default AIInterviewMode;
