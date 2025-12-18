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
        formData.append('source', 'ats_checker'); // Tag as ATS source
        
        // Add User Context for Admin Table
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if(u.id) formData.append('user_id', u.id);
                if(u.full_name) formData.append('user_name', u.full_name);
                if(u.email) formData.append('user_email', u.email);
            } catch(e) {}
        }
        
        try {
            const response = await axios.post('/scan-resume', formData);
             setResumeText(response.data.text_preview); 
        } catch (err) {
            console.error(err);
            const backendMsg = err.response?.data?.detail;
            setError(backendMsg || "Failed to parse resume. Please ensure it is a valid PDF.");
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
            // Add user context if logged in
            const storedUser = localStorage.getItem('user');
            const userData = storedUser ? JSON.parse(storedUser) : {};

            const response = await axios.post('/ats_check', {
                resume_text: resumeText,
                job_description: cleanedJD,
                user_id: userData.id,
                user_name: userData.full_name,
                user_email: userData.email
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
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono text-sm flex-shrink-0">01</div>
                                Resume Source
                            </label>
                            {resumeFile && (
                                <button 
                                    onClick={() => { setResumeFile(null); setResumeText(''); }}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Remove
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
                                className={`h-full min-h-[180px] md:min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden w-full
                                    ${resumeFile 
                                        ? 'border-blue-500/50 bg-blue-500/5' 
                                        : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                                    }`}
                            >
                                {analyzingResume ? (
                                    <div className="text-center z-10">
                                        <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-blue-400 font-mono animate-pulse text-sm md:text-base">EXTRACTING...</p>
                                    </div>
                                ) : resumeFile ? (
                                    <div className="text-center z-10 p-4 w-full max-w-full min-w-0">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                                            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <p className="text-base md:text-xl font-bold text-white mb-1 truncate px-2 max-w-full block">
                                            {resumeFile.name}
                                        </p>
                                        <p className="text-slate-400 text-xs md:text-sm">PDF • {(resumeFile.size / 1024).toFixed(0)} KB</p>
                                        <div className="mt-4 md:mt-6 flex items-center justify-center gap-2 text-green-400 text-xs md:text-sm font-medium bg-green-500/10 py-1.5 px-3 md:py-2 md:px-4 rounded-full w-fit mx-auto border border-green-500/20">
                                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            Ready
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center z-10 space-y-3 px-2">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover/upload:scale-110 transition-transform duration-300 border border-slate-700 group-hover/upload:border-slate-600">
                                            <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-base md:text-lg font-medium text-slate-300">Tap to upload</p>
                                            <p className="text-slate-500 text-xs md:text-sm mt-1">PDF only</p>
                                        </div>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Right: Job Description */}
                    <div className="flex flex-col h-full w-full">
                         <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-3 text-lg font-bold text-white">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono text-sm flex-shrink-0">02</div>
                                Target Job
                            </label>
                            <span className="text-xs text-slate-500 font-mono">{jobDescription.length} chars</span>
                        </div>

                        <div className="flex-1 relative group/jd w-full">
                            <div className="absolute inset-0 bg-slate-900 rounded-2xl border border-slate-700 transition-colors group-hover/jd:border-slate-600"></div>
                            <textarea 
                                className="relative w-full h-full min-h-[180px] md:min-h-[300px] bg-transparent rounded-2xl p-4 md:p-6 text-sm md:text-base text-slate-200 
                                    focus:outline-none resize-none placeholder-slate-600 custom-scrollbar leading-relaxed font-mono z-10"
                                placeholder="Paste the full Job Description here. Include responsibilities, requirements, and qualifications to get the best ATS score analysis."
                                value={jobDescription}
                                onChange={(e) => {
                                    setJobDescription(e.target.value);
                                    if (error) setError('');
                                }}
                            ></textarea>
                            
                            {/* Corner Accent */}
                            <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-50">
                                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
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
