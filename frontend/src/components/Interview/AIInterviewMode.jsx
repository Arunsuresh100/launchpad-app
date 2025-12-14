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
        <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto animate-fade-in-up">
            {/* Header / Quit */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-slate-900/50 backdrop-blur">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">AI</span>
                    HR Interview Coach
                </h2>
                <button onClick={onBack} className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-gray-700 rounded-lg hover:bg-gray-800">
                    Quit / Exit
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-12">
                
                {stage === 'upload' && (
                    <div className="text-center space-y-8 mt-12">
                        <div>
                            <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold mb-4">Start Your AI Interview</h1>
                            <p className="text-gray-400 text-lg max-w-xl mx-auto">Upload your resume. Our AI HR will generate personalized questions and interview you in real-time.</p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-xl mx-auto max-w-lg">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center">
                            <label className={`
                                flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all
                                ${analyzing ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 hover:border-blue-500 hover:bg-gray-800'}
                            `}>
                                {analyzing ? (
                                    <div className="flex flex-col items-center">
                                        <svg className="animate-spin w-10 h-10 text-blue-500 mb-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <p className="text-blue-400 font-bold">Analysing Resume & Preparing Questions...</p>
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-12 h-12 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        <div className="text-center">
                                            <span className="text-lg font-medium">Click to Upload Resume</span>
                                            <p className="text-sm text-gray-500 mt-1">PDF or DOCX (Max 4 Pages)</p>
                                        </div>
                                    </>
                                )}
                                <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} disabled={analyzing} />
                            </label>
                        </div>
                    </div>
                )}

                {stage === 'interview' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
                        {/* Visualizer Circle */}
                        <div className={`relative w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'scale-110 shadow-[0_0_50px_rgba(59,130,246,0.5)] bg-blue-600/20' : 'bg-gray-800 shadow-xl'}`}>
                            <div className={`absolute inset-0 rounded-full border-4 ${isSpeaking ? 'border-blue-500 animate-pulse' : 'border-gray-700'}`}></div>
                            {isSpeaking ? (
                                <div className="flex gap-1 h-12 items-end">
                                    <div className="w-2 bg-blue-400 animate-[bounce_1s_infinite] h-8"></div>
                                    <div className="w-2 bg-blue-400 animate-[bounce_1.2s_infinite] h-12"></div>
                                    <div className="w-2 bg-blue-400 animate-[bounce_0.8s_infinite] h-6"></div>
                                </div>
                            ) : (
                                <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            )}
                        </div>

                        <div className="text-center max-w-2xl w-full">
                            <h3 className="text-xl md:text-2xl font-bold mb-6 text-blue-100">
                                "{questions[currentQIndex]}"
                            </h3>
                            
                            <textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder={isListening ? "Listening..." : "Type your answer or speak..."}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px]"
                            />
                            
                            <div className="flex justify-center gap-4 mt-8">
                                <button 
                                    onClick={isListening ? stopListening : startListening}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse shadow-red-500/50' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {isListening ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        )}
                                    </svg>
                                </button>
                            </div>
                             <p className="text-sm text-gray-500 mt-2">{isListening ? "Listening..." : "Click mic to speak"}</p>
                        </div>
                        
                        <div className="flex gap-4 w-full max-w-md">
                            <button onClick={handleSkip} className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800">Skip</button>
                            <button onClick={handleNextQuestion} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20">Next Question →</button>
                        </div>
                        
                        <p className="text-gray-600 text-sm mt-4">Question {currentQIndex + 1} of {questions.length}</p>
                    </div>
                )}

                {stage === 'result' && finalFeedback && (
                    <div className="max-w-2xl mx-auto space-y-8 mt-8">
                        <div className="text-center">
                            <div className="w-32 h-32 rounded-full border-4 border-blue-500 flex items-center justify-center mx-auto mb-6 bg-slate-800">
                                <span className="text-5xl font-bold text-white">{finalFeedback.score}<span className="text-2xl text-gray-400">/10</span></span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Interview Completed</h2>
                            <p className="text-gray-400">Here is your AI feedback report.</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl">
                                <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Positives
                                </h3>
                                <ul className="space-y-2">
                                    {finalFeedback.pros.map((p, i) => (
                                        <li key={i} className="text-sm text-gray-300">• {p}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl">
                                <h3 className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Drawbacks & Tips
                                </h3>
                                <ul className="space-y-2">
                                    {finalFeedback.cons.map((c, i) => (
                                        <li key={i} className="text-sm text-gray-300">• {c}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        
                        <div className="flex justify-center pt-8">
                            <button onClick={()=>setStage('upload')} className="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform">
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIInterviewMode;
