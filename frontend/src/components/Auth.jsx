import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const Auth = ({ setPage, setUser }) => {
    // view: 'login' | 'signup' | 'forgot' | 'reset'
    const [view, setView] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false); // For Reset Flow
    const [showSecretInput, setShowSecretInput] = useState(false);
    const [secretKey, setSecretKey] = useState('');
    
    // Feature Notification State
    const [toast, setToast] = useState(null); // { msg: string, type: 'info' | 'warning' }

    // Refs
    const secretInputRef = useRef(null);

    // Auto-focus Secret Input
    useEffect(() => {
        if (showSecretInput && secretInputRef.current) {
            secretInputRef.current.focus();
        }
    }, [showSecretInput]);
    
    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        otp: '',
        new_password: '',
        confirm_password: ''
    });

    // Clear state on view switch
    useEffect(() => {
        setError('');
        // Fix: Only clear success message if we are NOT in the reset view
        // This keeps the OTP message visible when transitioning Forgot -> Reset
        // But clears it when going Reset -> Login or Back to Login
        if (view !== 'reset') {
            setSuccessMsg('');
            setFormData(prev => ({ ...prev, otp: '' })); // optional: clear OTP input too if leaving flow
        }
        
        // Reset other non-persistent form data
        setFormData(prev => ({
            ...prev,
            email: prev.email, // keep email for convenience sometimes, or clear. Let's keep existing logic mostly.
             // Actually, let's follow standard security: clear all sensitive fields
            password: '',
            // otp: '', // handled above
            new_password: '',
            confirm_password: ''
        }));
        
        if (view === 'login' || view === 'signup') {
             // Fully clear logic if returning to main auth
             setFormData({
                email: '',
                password: '',
                full_name: '',
                otp: '',
                new_password: '',
                confirm_password: ''
            });
        }

        setToast(null);
    }, [view]);

    const showFeatureToast = (msg) => {
        setToast({ msg, type: 'info' });
        setTimeout(() => setToast(null), 3000);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSocialLogin = (provider) => {
        showFeatureToast(`Social login with ${provider === 'google' ? 'Google' : 'GitHub'} is disabled in 'Demo Mode'.`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            if (view === 'login') {
                const res = await axios.post('/login', { // FIXED: Root endpoint
                    email: formData.email,
                    password: formData.password,
                    secret_key: secretKey || undefined // Pass secret if admin
                });
                setUser(res.data);
                
                // Admin Direction Check
                if (res.data.role === 'admin') {
                    setPage('admin'); 
                } else {
                    setPage('home');
                }

            } else if (view === 'signup') {
                const res = await axios.post('/register', { // FIXED: Root endpoint
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name
                });
                setSuccessMsg('Account created! Please sign in.');
                setTimeout(() => {
                    setView('login');
                    setSuccessMsg(''); 
                }, 2000);

            } else if (view === 'forgot') {
                const res = await axios.post('/auth/forgot-password', {
                    email: formData.email
                });
                // IMPT: Set message THEN switch view. 
                // The useEffect logic we added earlier ensures this message PERSISTS when view becomes 'reset'.
                setSuccessMsg(res.data.message); 
                setTimeout(() => {
                    setView('reset');
                }, 1000);

            } else if (view === 'reset') {
                 // Verify passwords match first
                 if (formData.new_password !== formData.confirm_password) {
                     throw new Error("Passwords do not match");
                 }

                const res = await axios.post('/auth/reset-password', {
                    email: formData.email,
                    otp: formData.otp,
                    new_password: formData.new_password
                });
                setSuccessMsg('Password reset successful! You can now login.');
                setTimeout(() => {
                    setView('login');
                }, 2000);
            }
        } catch (err) {
            console.error("Auth Error:", err);
            const errorMsg = err.response?.data?.detail || err.message || 'An error occurred. Please try again.';
            
            // Handle Admin Secret Key Requirement
            if (errorMsg === "REQUIRE_SECRET_KEY") {
                setShowSecretInput(true);
                setError(""); // Clear error so user just sees the input appear
                showFeatureToast("Admin access requires a security key.");
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-4 relative overflow-hidden font-sans">
             {/* Dynamic Background with slower, smoother animation */}
             <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-900/20 blur-[120px] animate-blob mix-blend-screen"></div>
                <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/20 blur-[120px] animate-blob animation-delay-2000 mix-blend-screen"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 blur-[120px] animate-blob animation-delay-4000 mix-blend-screen"></div>
             </div>
             
             {/* Enhanced Toast Notification */}
             <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 text-white rounded-2xl shadow-2xl shadow-black/50 min-w-[320px]"
                    >
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform rotate-3">
                            <span className="text-xl">🔒</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-200">Feature Locked</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{toast.msg}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </motion.div>
                )}
             </AnimatePresence>

            <div className="w-full h-full md:h-auto md:max-w-5xl bg-slate-900/80 md:bg-slate-900/60 backdrop-blur-2xl border-0 md:border md:border-slate-700/50 md:rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row md:min-h-[650px]">
                
                {/* Left Side: Professional Marketing View */}
                <div className="hidden md:flex w-[55%] relative flex-col justify-between p-16 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border-r border-slate-800/50">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 p-12 opacity-50">
                        <svg className="w-64 h-64 text-slate-800/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
                    </div>

                    <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             </div>
                             <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-200 tracking-tight">LaunchPad AI</span>
                         </div>

                        <h2 className="text-5xl font-extrabold text-white mb-6 leading-[1.15] tracking-tight">
                            Master Your <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x">Dream Career</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-sm font-light">
                            The all-in-one platform for developers to prep, practice, and perform.
                        </p>
                        
                        <div className="space-y-5">
                            {[
                                { title: 'AI Resume Analysis', desc: 'Get instant feedback on your CV' },
                                { title: 'Technical Mock Quizzes', desc: 'Practice real-world interview/coding questions' },
                                { title: 'ATS Score Optimization', desc: 'Beat the automated screening bots' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-start gap-4 group cursor-default">
                                    <div className="w-8 h-8 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mt-1 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-colors">
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-200 font-semibold text-base group-hover:text-blue-200 transition-colors">{item.title}</h3>
                                        <p className="text-slate-500 text-sm group-hover:text-slate-400 transition-colors">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative z-10 mt-12 flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-widest">
                        <span className="w-8 h-[1px] bg-slate-700"></span>
                        Trusted by devlopers
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-[45%] p-8 md:p-12 flex flex-col justify-center bg-transparent md:bg-slate-950/30 relative">
                    <div className="max-w-sm mx-auto w-full relative z-10">
                         {/* Header Mobile */}
                         <div className="md:hidden text-center mb-10 mt-4">
                             <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl shadow-blue-500/20">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">LaunchPad AI</h2>
                            <p className="text-slate-400 mt-2 text-sm">Your personal career copilot.</p>
                         </div>

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-white">
                                {view === 'forgot' ? 'Reset Password' : (view === 'reset' ? 'Set New Password' : (view === 'login' ? 'Sign In' : 'Create Account'))}
                            </h3>
                            <p className="text-slate-400 text-sm mt-2">
                                {view === 'forgot' || view === 'reset' ? (
                                    <button onClick={() => setView('login')} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center justify-center gap-1 mx-auto">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                        Back to Sign In
                                    </button>
                                ) : (
                                    <>
                                        {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                                        <button 
                                            onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(''); }} 
                                            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                        >
                                            {view === 'login' ? 'Sign up' : 'Log in'}
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Messages */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center animate-shake">
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-200 text-sm text-center">
                                <p className="font-bold mb-1">{successMsg}</p>
                                {view === 'reset' && (
                                    <p className="text-xs text-green-400/70 mt-1">
                                        (Note: Real email delivery will be enabled in a future update. Please use the demo code above.)
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Social Buttons (Hidden in forgot/reset mode) */}
                        {view !== 'forgot' && view !== 'reset' && (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-all text-sm font-medium group">
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                                        Google
                                    </button>
                                    <button onClick={() => handleSocialLogin('github')} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white transition-all text-sm font-medium group">
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                        GitHub
                                    </button>
                                </div>

                                <div className="relative mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-800"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-slate-900 text-slate-500">Or continue with email</span>
                                    </div>
                                </div>
                            </>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                            {/* ADMIN SECRET KEY FLOW */}
                            {showSecretInput ? (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                                            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-yellow-200 font-bold text-sm">Admin Verification</h4>
                                            <p className="text-yellow-400/70 text-xs">Enter your 6-digit secure passkey.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-300 ml-1">Secret Key</label>
                                        <input 
                                            ref={secretInputRef}
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            required 
                                            type="password" 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600 tracking-[0.5em] text-center font-mono text-lg" 
                                            placeholder="••••••" 
                                            maxLength={6}
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/25 mt-2 flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Verifying...' : 'Authenticate Admin'}
                                    </button>
                                     <button 
                                        type="button"
                                        onClick={() => { setShowSecretInput(false); setError(''); }}
                                        className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {view === 'signup' && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                                            <input 
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                required 
                                                type="text" 
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" 
                                                placeholder="John Doe" 
                                            />
                                        </div>
                                    )}

                                    {view === 'reset' && (
                                        <div className="space-y-4 animate-fade-in-up">
                                            {/* DEMO INBOX UI */}
                                            {successMsg && successMsg.includes("DEMO MODE") && (
                                                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden mb-6">
                                                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                            <span className="ml-2 text-xs text-slate-400 font-mono">Mock Email Inbox</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-slate-400 text-xs mb-1">From: <span className="text-blue-400">auth@launchpad.com</span></p>
                                                        <p className="text-slate-400 text-xs mb-3">Subject: Password Reset OTP</p>
                                                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700/50">
                                                            <span className="text-xl font-mono text-white tracking-widest font-bold">
                                                                {successMsg.match(/(\d{6})/) ? successMsg.match(/(\d{6})/)[0] : '------'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const code = successMsg.match(/(\d{6})/) ? successMsg.match(/(\d{6})/)[0] : '';
                                                                    if(code) {
                                                                        navigator.clipboard.writeText(code);
                                                                        showFeatureToast("OTP Copied!");
                                                                        setFormData({...formData, otp: code}); // Auto-fill
                                                                    }
                                                                }}
                                                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
                                                            >
                                                                Copy & Fill
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-300 ml-1">OTP Code</label>
                                                <input 
                                                    name="otp"
                                                    value={formData.otp}
                                                    onChange={handleChange}
                                                    required 
                                                    type="text" 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 text-center tracking-widest font-mono" 
                                                    placeholder="123456" 
                                                    maxLength={6}
                                                />
                                            </div>
                                            <div className="space-y-1 relative">
                                                <label className="text-sm font-medium text-slate-300 ml-1">New Password</label>
                                                <div className="relative">
                                                    <input 
                                                        name="new_password"
                                                        value={formData.new_password}
                                                        onChange={handleChange}
                                                        required 
                                                        type={showNewPassword ? "text" : "password"} 
                                                        autoComplete="new-password"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 pr-10" 
                                                        placeholder="••••••••" 
                                                    />
                                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                                        {showNewPassword ? (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 relative">
                                                <label className="text-sm font-medium text-slate-300 ml-1">Confirm New Password</label>
                                                <div className="relative">
                                                     <input 
                                                        name="confirm_password"
                                                        value={formData.confirm_password}
                                                        onChange={handleChange}
                                                        required 
                                                        type={showNewPassword ? "text" : "password"} 
                                                        autoComplete="new-password"
                                                        className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-white focus:ring-1 outline-none transition-all placeholder:text-slate-600 pr-10 ${formData.confirm_password && formData.new_password !== formData.confirm_password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'}`}
                                                        placeholder="••••••••" 
                                                    />
                                                </div>
                                                {/* Real-time Match Validation */}
                                                {formData.confirm_password && formData.new_password !== formData.confirm_password && (
                                                    <p className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        Passwords do not match
                                                    </p>
                                                )}
                                                {formData.confirm_password && formData.new_password === formData.confirm_password && (
                                                     <p className="text-green-400 text-xs mt-1 ml-1 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        Passwords match
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {(view === 'login' || view === 'signup' || view === 'forgot') && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                                        <input 
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required 
                                            type="email" 
                                            autoComplete="email"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" 
                                            placeholder="john@company.com" 
                                        />
                                    </div>
                                    )}

                                    {view !== 'forgot' && view !== 'reset' && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                                                {view === 'login' && (
                                                    <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                                        Forgot?
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    required 
                                                    type={showPassword ? "text" : "password"} 
                                                    autoComplete="current-password"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 pr-10" 
                                                    placeholder="••••••••" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 mt-2 flex items-center justify-center gap-2"
                                    >
                                        {loading && <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                        {loading ? 'Processing...' : (view === 'forgot' ? 'Send Reset Link' : (view === 'reset' ? 'Set New Password' : (view === 'login' ? 'Sign In' : 'Create Account')))}
                                    </button>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>
            
            {/* Back to Home Control */}
            <button onClick={() => setPage('home')} className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors z-20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Home
            </button>
        </div>
    );
};

export default Auth;
