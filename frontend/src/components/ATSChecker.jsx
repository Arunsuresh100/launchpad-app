import React, { useState } from 'react';
import axios from 'axios';

const ATSChecker = () => {
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState(''); // Text extracted from resume
    const [jobDescription, setJobDescription] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analyzingResume, setAnalyzingResume] = useState(false);

    const [error, setError] = useState('');

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAnalyzingResume(true);
        setError(''); // Clear errors
        setResumeFile(file);
        
        // Upload to extract text first
        const formData = new FormData();
        formData.append('file', file);
        
        // Append User ID for analytics if available
        const storedUser = localStorage.getItem("user_data");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed.id) {
                    formData.append("user_id", parsed.id);
                }
            } catch(e) { 
                console.log("Error parsing user data for ID:", e);
            }
        }

        try {
            const response = await axios.post('http://127.0.0.1:8000/scan-resume', formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
             setResumeText(response.data.text_preview); 
        } catch (err) {
            console.error(err);
            setError("Failed to parse resume. Please try another PDF.");
        } finally {
            setAnalyzingResume(false);
        }
    };
    
    const handleCheck = async () => {
        if (!resumeText) {
            setError("Please upload a resume first.");
            return;
        }

        const cleanedJD = jobDescription.trim();
        if (!cleanedJD || cleanedJD.length < 3) {
            setError("Please enter a valid Job Title or Description.");
            return;
        }

        setError(''); // Clear previous errors
        setLoading(true);
        try {
            const response = await axios.post('/ats_check', {
                resume_text: resumeText,
                job_description: cleanedJD
            });
            setResult(response.data);
        } catch (err) {
            console.error(err);
            setError("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-2 md:p-6 text-white animate-fade-in-up w-full overflow-hidden">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent px-4">
                ATS Compatibility Checker
            </h2>

            {error && (
                <div className="mb-6 mx-2 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse text-sm md:text-base">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            {/* Main Input Console */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-hidden group w-full">
                {/* Ambient Background - Smaller on mobile to prevent overflow/rendering issues */}
                <div className="absolute top-0 right-0 w-32 h-32 md:w-[500px] md:h-[500px] bg-blue-500/5 rounded-full blur-[50px] md:blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 md:w-[500px] md:h-[500px] bg-purple-500/5 rounded-full blur-[50px] md:blur-[100px] pointer-events-none"></div>

                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 relative z-10 w-full">
                    
                    {/* Left: Resume Upload */}
                    <div className="flex flex-col h-full w-full">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-3 text-lg font-bold text-white">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 font-mono text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">01</span>
                                Upload Resume
                            </label>
                            {resumeFile && (
                                <button 
                                    onClick={(e) => { e.preventDefault(); setResumeFile(null); setResumeText(''); }}
                                    className="px-3 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-all"
                                >
                                    Remove File
                                </button>
                            )}
                        </div>

                        <div className="flex-1 relative group/upload w-full min-w-0">
                            <input 
                                type="file" 
                                accept=".pdf"
                                onChange={handleResumeUpload}
                                className="hidden"
                                id="ats-resume-upload"
                            />
                            <label 
                                htmlFor="ats-resume-upload" 
                                className={`h-full min-h-[220px] md:min-h-[350px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-500 relative overflow-hidden w-full backdrop-blur-sm
                                    ${resumeFile 
                                        ? 'border-blue-500 bg-blue-900/10 shadow-[0_0_30px_rgba(59,130,246,0.1)]' 
                                        : 'border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/30'
                                    }`}
                            >
                                {/* Animated Background Pattern */}
                                <div className="absolute inset-0 opacity-0 group-hover/upload:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 to-transparent pointer-events-none"></div>

                                {analyzingResume ? (
                                    <div className="text-center z-10 p-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-blue-400 font-mono font-bold tracking-wider animate-pulse text-sm md:text-base">PARSING DOCUMENT...</p>
                                    </div>
                                ) : resumeFile ? (
                                    <div className="text-center z-10 w-full px-6 flex flex-col items-center animate-fade-in-up">
                                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_10px_30px_rgba(37,99,235,0.3)] transform transition-transform group-hover/upload:scale-105 group-hover/upload:rotate-3">
                                            <svg className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <div className="bg-slate-900/80 rounded-xl px-4 py-3 border border-slate-700/50 max-w-full">
                                            <p className="text-base md:text-lg font-bold text-white truncate max-w-[200px] mx-auto">
                                                {resumeFile.name}
                                            </p>
                                            <p className="text-slate-400 text-xs mt-1 font-mono uppercase">
                                                {(resumeFile.size / 1024).toFixed(1)} KB • PDF
                                            </p>
                                        </div>
                                        <div className="mt-5 flex items-center gap-2 text-green-400 text-xs md:text-sm font-bold bg-green-500/10 py-1.5 px-4 rounded-full border border-green-500/20 shadow-sm">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            Ready for Analysis
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center z-10 space-y-4 px-4">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto group-hover/upload:scale-110 group-hover/upload:bg-blue-500/20 transition-all duration-300 border border-slate-700/50 group-hover/upload:border-blue-500/50 shadow-inner">
                                            <svg className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover/upload:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-lg md:text-xl font-bold text-slate-200 group-hover/upload:text-white transition-colors">Drop Resume Here</p>
                                            <p className="text-slate-500 text-sm mt-1 group-hover/upload:text-slate-400">or click to browse</p>
                                        </div>
                                        <span className="inline-block px-3 py-1 bg-slate-800 rounded text-[10px] text-slate-500 font-mono border border-slate-700">Supported: PDF</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Right: Job Description */}
                    <div className="flex flex-col h-full w-full">
                         <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-3 text-lg font-bold text-white">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-mono text-sm shadow-[0_0_15px_rgba(168,85,247,0.2)]">02</span>
                                Job Description
                            </label>
                            <span className={`text-xs font-mono transition-colors ${jobDescription.length > 50 ? 'text-green-400' : 'text-slate-500'}`}>
                                {jobDescription.length} chars
                            </span>
                        </div>

                        <div className="flex-1 relative group/jd w-full flex flex-col">
                            {/* Editor Window Header */}
                            <div className="h-9 bg-slate-800/80 rounded-t-2xl border-x border-t border-slate-700 flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono ml-2 uppercase">Input_Job_Requirements.txt</span>
                            </div>
                            
                            <div className="flex-1 relative">
                                <div className="absolute inset-0 bg-slate-900/80 rounded-b-2xl border-x border-b border-slate-700 transition-colors group-hover/jd:border-slate-600/80 group-focus-within:border-purple-500/50 group-focus-within:shadow-[0_0_20px_rgba(168,85,247,0.1)]"></div>
                                <textarea 
                                    className="relative w-full h-full min-h-[200px] md:min-h-[315px] bg-transparent rounded-b-2xl p-4 md:p-6 text-sm md:text-base text-slate-200 
                                        focus:outline-none resize-none placeholder-slate-600 custom-scrollbar leading-relaxed font-mono z-10"
                                    placeholder="Paste the Job Description (JD) here...&#10;&#10;Tip: You can also just type a role like 'Software Engineer' or 'Data Analyst' for a quick check."
                                    value={jobDescription}
                                    onChange={(e) => {
                                        setJobDescription(e.target.value);
                                        if (error) setError('');
                                    }}
                                ></textarea>
                                
                                {/* Corner Accent */}
                                <div className="absolute bottom-4 right-4 pointer-events-none opacity-20">
                                    <svg className="w-16 h-16 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <button 
                    onClick={handleCheck}
                    disabled={!resumeText || !jobDescription || loading}
                    className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105
                        ${!resumeText || !jobDescription 
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white'}`}
                >
                    {loading ? 'Crunching Numbers...' : 'Calculate ATS Score'}
                </button>
            </div>

            {/* Results Section */}
            {result && (
                <div className="mt-12 bg-gray-900/80 border border-gray-700 rounded-2xl p-6 md:p-8 backdrop-blur-xl animate-fade-in-up">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Score Circle */}
                        <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    className="text-gray-700"
                                    strokeWidth="12"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="60"
                                    cx="50%"
                                    cy="50%"
                                />
                                <circle
                                    className={`${result.score >= 70 ? 'text-green-500' : result.score >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                    strokeWidth="12"
                                    strokeDasharray={377}
                                    strokeDashoffset={377 - (377 * result.score) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="60"
                                    cx="50%"
                                    cy="50%"
                                />
                            </svg>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                <span className="text-3xl md:text-4xl font-bold text-white">{result.score}%</span>
                                <span className="block text-[10px] md:text-xs text-gray-400 uppercase tracking-widest mt-1">Match</span>
                            </div>
                        </div>

                        {/* Analysis Text */}
                        <div className="flex-1 w-full">
                            <h3 className="text-2xl font-bold text-white mb-4 text-center md:text-left">Analysis Report</h3>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="flex items-center gap-2 text-green-400 font-semibold mb-3 text-sm md:text-base">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        Matched Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                        {result.matched_keywords.length > 0 ? (
                                            result.matched_keywords.map((k, i) => (
                                                <span key={i} className="px-2 py-1 bg-green-500/10 text-green-300 text-[10px] md:text-xs rounded border border-green-500/20">{k}</span>
                                            ))
                                        ) : <span className="text-gray-500 text-sm">No exact matches found.</span>}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="flex items-center gap-2 text-red-400 font-semibold mb-3 text-sm md:text-base">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Missing Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                        {result.missing_keywords.length > 0 ? (
                                            result.missing_keywords.map((k, i) => (
                                                <span key={i} className="px-2 py-1 bg-red-500/10 text-red-300 text-[10px] md:text-xs rounded border border-red-500/20">{k}</span>
                                            ))
                                        ) : <span className="text-green-500 text-sm">Great job! No obvious keywords missing.</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Improvement Suggestions */}
                    <div className="mt-8 border-t border-gray-700 pt-6">
                        <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-yellow-400">⚡</span>
                            Action Plan to Improve Score
                        </h4>
                        
                        <div className="space-y-4">
                            {result.score < 50 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                                    <h5 className="font-bold text-red-400 mb-1">Critical Mismatch Detected</h5>
                                    <p className="text-gray-300 text-sm">
                                        Your resume scored low (<span className="font-bold">{result.score}%</span>). This suggests a significant gap between your resume and the job description.
                                        Check if you are applying for the right role, or if your resume is machine-readable (pdf parsing issues).
                                    </p>
                                </div>
                            )}

                            {result.missing_keywords.length > 0 && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                                    <h5 className="font-bold text-blue-400 mb-1">Keyword Optimization</h5>
                                    <p className="text-gray-300 text-sm mb-2">
                                        The ATS is specifically looking for these high-value terms. Try to weave them into your <strong>Skills</strong> or <strong>Work Experience</strong> sections naturally:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.missing_keywords.slice(0, 5).map((k, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30 font-mono">
                                                {k}
                                            </span>
                                        ))}
                                        {result.missing_keywords.length > 5 && (
                                            <span className="text-gray-500 text-xs self-center">...and {result.missing_keywords.length - 5} more</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {result.score >= 80 ? (
                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                                    <h5 className="font-bold text-green-400 mb-1">Excellent Optimization!</h5>
                                    <p className="text-gray-300 text-sm">
                                        Your content matches the job description well. Now focus on formatting: ensure you have clear headings, consistent fonts, and no complex columns or graphics that might confuse older ATS parsers.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                                    <h5 className="font-bold text-yellow-400 mb-1">General Advice</h5>
                                    <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
                                        <li>Ensure exact spelling matches for technical skills (e.g., "React.js" vs "React").</li>
                                        <li>Quantify your achievements (e.g., "Improved performance by 20%").</li>
                                        <li>Use standard section headings like "Experience" and "Skills".</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ATSChecker;
