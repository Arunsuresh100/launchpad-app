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
        // setSuccessMsg(''); // Handled manually to allow persistence across views
        setFormData({
            email: '',
            password: '',
            full_name: '',
            otp: '',
            new_password: '',
            confirm_password: ''
        });
        setToast(null);
    }, [view]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccessMsg('');
    };

    const showFeatureToast = (msg) => {
        setToast({ msg, type: 'info' });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSocialLogin = (provider) => {
        // Professional "Coming Soon" Message
        showFeatureToast(`${provider === 'google' ? 'Google' : 'GitHub'} login will be available in future updates.`);
    };

    const validateEmail = (email) => {
        // Strict Regex
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!re.test(email)) return false;
        if (email.includes('.com.com') || email.includes('.co.co')) return false; // Double TLD check
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            // Validation
            if ((view === 'login' || view === 'signup' || view === 'forgot') && !validateEmail(formData.email)) {
                setError("Please enter a valid email address.");
                setLoading(false);
                return;
            }

            if (view === 'forgot') {
                const res = await axios.post('/auth/forgot-password', { email: formData.email });
                // Extract OTP message to show in next view
                // Extract OTP message to show in next view
                const otpMsg = res.data.message; 
                // setSuccessMsg(otpMsg); REMOVED to prevent showing in current view
                
                // Switch to reset view after 1.5s but PASS the message 
                setTimeout(() => {
                    setView('reset');
                    // CRITICAL: Set success message AGAIN so it persists in the new view
                    // and doesn't disappear. 
                    // We also append the note about future updates here or in the UI.
                    setSuccessMsg(otpMsg); 
                }, 1500);
                return;
            }

            if (view === 'reset') {
                if (formData.new_password !== formData.confirm_password) {
                    setError("Passwords do not match!");
                    setLoading(false);
                    return;
                }
                const res = await axios.post('/auth/reset-password', {
                    email: formData.email,
                    otp: formData.otp,
                    new_password: formData.new_password
                });
                setSuccessMsg(res.data.message);
                setTimeout(() => {
                    setView('login');
                }, 2000);
                return;
            }

            const endpoint = view === 'login' ? '/login' : '/register';
            const payload = view === 'login' 
                ? { 
                    email: formData.email, 
                    password: formData.password,
                    secret_key: showSecretInput ? secretKey : null 
                  }
                : formData; 

            const response = await axios.post(endpoint, payload);
            
            // Success
            setUser(response.data); // Save user to global state
            if (response.data.token) localStorage.setItem('token', response.data.token);
            setPage(response.data.role === 'admin' ? 'admin' : 'home'); // Redirect based on role

        } catch (err) {
            console.error("Auth Error:", err);
            
            // HANDLE ADMIN 2FA
            if (err.response?.status === 403 && err.response?.data?.detail === "REQUIRE_SECRET_KEY") {
                setShowSecretInput(true);
                setError(''); // clear error to show the input cleanly
            } else {
                setError(err.response?.data?.detail || "Authentication failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
             {/* Dynamic Background */}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute top-[30%] -right-[10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
            </div>

            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50, x: '-50%' }} 
                        animate={{ opacity: 1, y: 0, x: '-50%' }} 
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-8 left-1/2 z-[100] bg-slate-800/90 border border-blue-500/30 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
                    >
                         <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         <span className="text-sm font-medium">{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full max-w-5xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                
                {/* Left Side: Visual/Marketing */}
                <div className="hidden md:flex w-1/2 relative bg-slate-900/50 flex-col items-center justify-center p-12 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30 opacity-50"></div>
                     {/* 3D-ish graphic element */}
                    <motion.div 
                        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 w-48 h-48 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl shadow-2xl flex items-center justify-center mb-10 transform perspective-1000 rotate-y-12 rotate-x-12 border border-white/20"
                    >
                         <svg className="w-24 h-24 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         <div className="absolute inset-0 bg-white/10 rounded-3xl backdrop-blur-sm"></div>
                    </motion.div>

                    <div className="relative z-10 max-w-sm">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            {view === 'forgot' ? 'Account Recovery' : (view === 'login' ? 'Welcome Back!' : 'Join the Revolution')}
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            {view === 'forgot' 
                                ? "Don't worry, it happens to the best of us. We'll help you get back in."
                                : (view === 'login' 
                                    ? "Resume optimization, interview sims, and career tracking all in one place."
                                    : "Start your journey to a better career today. 10,000+ users are already hired."
                                )
                            }
                        </p>
                    </div>

                    {/* Testimonial Pill */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[80%]">
                        <div className="bg-slate-950/60 backdrop-blur-md border border-slate-700 rounded-full py-2 px-4 flex items-center gap-3">
                            <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-blue-500 border border-slate-900"></div>
                                <div className="w-6 h-6 rounded-full bg-purple-500 border border-slate-900"></div>
                                <div className="w-6 h-6 rounded-full bg-green-500 border border-slate-900"></div>
                            </div>
                            <span className="text-xs text-slate-400">Trusted by top engineers</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-slate-950/30">
                    <div className="max-w-md mx-auto w-full">
                         {/* Header Mobile */}
                         <div className="md:hidden text-center mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">LaunchPad.</h2>
                            <p className="text-slate-400">Your career control center.</p>
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
