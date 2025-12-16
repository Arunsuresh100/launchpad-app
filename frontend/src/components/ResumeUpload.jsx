import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const ResumeUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    
    // New states for Job Search
    const [jobs, setJobs] = useState(null);
    const [jobType, setJobType] = useState('full_time');
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setError('');
            setData(null);
            setJobs(null);
            
            // Auto-trigger upload
            handleUpload(selectedFile);
        }
    };

    const handleUpload = async (fileArg = null) => {
        const fileToUpload = fileArg || file;
        if (!fileToUpload) return;

        setUploading(true);
        setError('');
        
        const formData = new FormData();
        formData.append('file', fileToUpload);

        try {
            const response = await axios.post('/scan-resume', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setData(response.data);
            // Auto-fetch jobs after analysis
            fetchJobs(response.data.extracted_skills);
        } catch (err) {
            console.error(err);
            // Show specific error from backend if available (e.g. "Not a valid resume")
            const backendMsg = err.response?.data?.detail;
            setError(backendMsg || 'Failed to process resume. Ensure the backend is running and the file is a PDF.');
        } finally {
            setUploading(false);
        }
    };

    const fetchJobs = async (skillsToSearch, type = jobType) => {
        setLoadingJobs(true);
        try {
            const response = await axios.post(`/search_jobs?contract_type=${type}`, skillsToSearch);
            setJobs(response.data);
        } catch (err) {
            console.error("Job search failed", err);
        } finally {
            setLoadingJobs(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-fade-in-up">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent inline-block mb-4">
                    AI Career Launchpad
                </h2>
                <p className="text-gray-400 text-lg">Upload your resume and let our AI find your perfect role.</p>
            </div>

            {/* ERROR ALERT */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}

            {/* PART 1: UPLOAD SECTION */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                {/* Decorative Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm">1</span>
                    Upload Resume
                </h3>

                <div className="w-full">
                     <div 
                        className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 relative group/upload
                            ${file ? 'border-green-500/50 bg-green-500/5' : 'border-gray-600 hover:border-blue-400 hover:bg-gray-800/50'}`}
                        onClick={() => document.getElementById('fileInput').click()}
                    >
                        <input 
                            type="file" 
                            id="fileInput" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                        
                        <div className="flex flex-col items-center gap-4">
                            {uploading ? (
                                <div className="flex flex-col items-center gap-4">
                                     <svg className="animate-spin w-12 h-12 text-blue-500" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-lg font-medium text-blue-400 animate-pulse">Analyzing Resume & Matching Jobs...</p>
                                </div>
                            ) : (
                                <>
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500
                                        ${file ? 'bg-green-500 text-white scale-110' : 'bg-gray-800 text-blue-400 group-hover/upload:bg-blue-500/20 group-hover/upload:scale-110'}`}>
                                        {file ? (
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xl font-medium text-white mb-2">
                                            {file ? file.name : "Click to Upload PDF Resume"}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {file ? "Upload a different file to replace" : "We'll automatically extract skills and find jobs"}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {(data || loadingJobs) && (
                <div className="grid md:grid-cols-12 gap-8 items-start">
                    {/* PART 2: EXTRACTED SKILLS */}
                    <div className="md:col-span-4 space-y-8">
                        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 border-b border-gray-800 pb-4">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm">2</span>
                                Analysis Report
                            </h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Extracted Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data && data.extracted_skills.map((skill, index) => (
                                            <span key={index} className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-lg text-sm font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {data && (
                                    <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
                                        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            AI Insight
                                        </h4>
                                        <p className="text-sm text-gray-400">
                                            Your skill profile matches <span className="text-white font-bold">{data.extracted_skills.length}</span> key technologies. Based on this, we've curated opportunities below.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PART 3: RECOMMENDED ROLES */}
                    <div className="md:col-span-8">
                        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-xl min-h-[500px]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-800 pb-4 gap-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 text-sm">3</span>
                                    Recommended Roles
                                </h3>
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowFilter(!showFilter)}
                                        className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-700 transition w-full sm:w-auto justify-between"
                                    >
                                        <span>{jobType === 'full_time' ? 'Full Time' : 'Internships'}</span>
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                     {showFilter && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)}></div>
                                            <div className="absolute right-0 mt-2 w-full sm:w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up origin-top-right">
                                                <button onClick={() => { setJobType('full_time'); setShowFilter(false); if (data) fetchJobs(data.extracted_skills, 'full_time'); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-700 text-white">Full Time</button>
                                                <button onClick={() => { setJobType('internship'); setShowFilter(false); if (data) fetchJobs(data.extracted_skills, 'internship'); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-700 text-white">Internship</button>
                                            </div>
                                        </>
                                     )}
                                </div>
                            </div>

                            {loadingJobs ? (
                                <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                                    <svg className="animate-spin w-10 h-10 text-green-500 mb-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p>Curating the best jobs for you...</p>
                                </div>
                            ) : jobs ? (
                                <motion.div layout className="space-y-4 min-h-[300px]">
                                    <AnimatePresence mode="popLayout">
                                        {[...jobs.local_matches, ...jobs.api_matches].length === 0 ? (
                                             <motion.div 
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="text-center text-gray-500 py-12"
                                             >
                                                No matching jobs found. Try refreshing or updating skills.
                                             </motion.div>
                                        ) : (
                                            [...jobs.local_matches, ...jobs.api_matches].map((job, i) => (
                                                <motion.div 
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    key={job.id || i} 
                                                    className="bg-gray-800/50 p-5 rounded-xl border border-gray-700/50 hover:border-green-500/50 hover:bg-gray-800 transition-colors group"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h5 className="font-bold text-white text-lg group-hover:text-green-400 transition-colors">{job.title}</h5>
                                                            <p className="text-blue-400 text-sm mb-2">{job.company}</p>
                                                        </div>
                                                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-green-600 transition-all">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                        </a>
                                                    </div>
                                                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{job.description}</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            {job.location}
                                                        </span>
                                                        <span className="bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                                                            {job.source || 'Matched'}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeUpload;
