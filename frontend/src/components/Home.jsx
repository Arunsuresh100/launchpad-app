import React, { useRef, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Points, PointMaterial } from '@react-three/drei';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- 3D BACKGROUND ---
const DynamicParticles = (props) => {
     const ref = useRef();
     
     const sphere = useMemo(() => {
         const points = new Float32Array(5000 * 3);
         for (let i = 0; i < 5000; i++) {
             const r = 1.2 * Math.cbrt(Math.random()); 
             const theta = Math.random() * 2 * Math.PI;
             const phi = Math.acos(2 * Math.random() - 1);
             const x = r * Math.sin(phi) * Math.cos(theta);
             const y = r * Math.sin(phi) * Math.sin(theta);
             const z = r * Math.cos(phi);
             points[i * 3] = x;
             points[i * 3 + 1] = y;
             points[i * 3 + 2] = z;
         }
         return points;
     }, []);

    useFrame((state, delta) => {
        if(ref.current) {
            ref.current.rotation.x -= delta / 20;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#8b5cf6"
                    size={0.002}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.6}
                />
            </Points>
        </group>
    );
};

const Scene = () => {
    return (
        <Canvas className="h-full w-full" camera={{ position: [0, 0, 1] }} dpr={[1, 2]}> 
            <group rotation={[0, 0, Math.PI / 4]}>
                <DynamicParticles />
                <Stars radius={50} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
            </group>
        </Canvas>
    );
};

// --- COMPONENTS ---

const FeatureCard = ({ title, desc, icon, delay }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="p-8 rounded-3xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all hover:border-blue-500/30 group flex flex-col items-center text-center"
    >
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-lg">{desc}</p>
    </motion.div>
);

const StepItem = ({ number, title, desc }) => (
    <div className="flex gap-8 items-start relative pb-16 last:pb-0 group">
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-white z-10 group-hover:bg-blue-600 group-hover:border-blue-500 transition-colors">
                {number}
            </div>
            {number !== "4" && (
                <div className="w-0.5 h-full bg-slate-800 absolute top-12 left-6 -translate-x-1/2 group-hover:bg-blue-900/50 transition-colors"></div>
            )}
        </div>
        <div className="pt-2">
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">{desc}</p>
        </div>
    </div>
);

// --- SECTIONS ---

const HeroSection = ({ setPage }) => {
    return (
        <div className="relative h-screen w-full flex items-center overflow-hidden bg-slate-950 pt-16">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
            
            {/* 3D Scene Layer */}
            <div className="absolute inset-0 z-0">
                <Scene />
            </div>

            <div className="container mx-auto px-6 md:px-12 lg:px-24 relative z-10 h-full flex items-center">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 w-full items-center">
                    
                    {/* Left: Content - Simplified */}
                    <div className="text-left space-y-6 relative z-20">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight"
                        >
                            Unlock Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                True Potential.
                            </span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-lg md:text-xl text-slate-400 max-w-lg leading-normal"
                        >
                            Our AI analyzes your resume and simulates real interviews to help you land your dream job faster.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="flex flex-col sm:flex-row gap-4 pt-4"
                        >
                            <button 
                                onClick={() => setPage('resume')}
                                className="flex-1 sm:flex-none px-5 py-3 sm:px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold text-base sm:text-lg transition-all shadow-lg hover:shadow-blue-500/25 whitespace-nowrap"
                            >
                                Analyze Resume
                            </button>
                            <button 
                                onClick={() => setPage('interview')}
                                className="flex-1 sm:flex-none px-5 py-3 sm:px-8 bg-slate-800/50 hover:bg-slate-800 text-white rounded-full font-semibold text-base sm:text-lg transition-all border border-slate-700 hover:border-slate-600 backdrop-blur-sm whitespace-nowrap"
                            >
                                Mock Interview
                            </button>
                        </motion.div>
                    </div>

                    {/* Right: Holographic Scanner Visual */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, rotateY: -10 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ delay: 0.4, duration: 1 }}
                        className="relative hidden lg:block perspective-1000"
                    >
                         {/* The Glass Scan Card */}
                         <div className="relative w-full max-w-md mx-auto aspect-[3/4] bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl transform rotate-y-12">
                            {/* Header */}
                            <div className="h-14 border-b border-slate-700/50 bg-slate-800/30 flex items-center px-6 gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            </div>
                            
                            {/* Content Skeleton */}
                            <div className="p-8 space-y-6 opacity-40">
                                <div className="w-20 h-20 rounded-full bg-slate-600 mb-6"></div>
                                <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-600 rounded w-1/2"></div>
                                <div className="space-y-3 pt-6">
                                    <div className="h-2 bg-slate-700 rounded w-full"></div>
                                    <div className="h-2 bg-slate-700 rounded w-full"></div>
                                    <div className="h-2 bg-slate-700 rounded w-5/6"></div>
                                </div>
                            </div>

                            {/* SCANNING LASER */}
                            <motion.div 
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] z-10"
                            >
                                <div className="absolute inset-0 bg-blue-400 blur-sm"></div>
                            </motion.div>

                            {/* Floating Detected Tags */}
                            <motion.div 
                                animate={{ opacity: [0, 1, 0], y: [20, -20] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                className="absolute top-1/4 right-10 bg-green-500/20 border border-green-500/50 text-green-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md"
                            >
                                React Mastery: 98%
                            </motion.div>
                            <motion.div 
                                animate={{ opacity: [0, 1, 0], y: [20, -20] }}
                                transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
                                className="absolute top-1/2 left-10 bg-purple-500/20 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md"
                            >
                                Leadership Detected
                            </motion.div>
                             <motion.div 
                                animate={{ opacity: [0, 1, 0], y: [20, -20] }}
                                transition={{ duration: 2.2, repeat: Infinity, delay: 2.5 }}
                                className="absolute bottom-1/4 right-16 bg-blue-500/20 border border-blue-500/50 text-blue-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md"
                            >
                                ATS Score: High
                            </motion.div>

                         </div>
                         
                         {/* Back Glow */}
                         <div className="absolute -inset-10 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-[60px] -z-10 rounded-full"></div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const AboutSection = () => {
    return (
        <div className="py-20 md:py-32 bg-slate-950 relative overflow-hidden">
            <div className="container mx-auto px-6 md:px-12 lg:px-24">
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Why traditional prep fails?</h2>
                    <p className="text-xl text-slate-400">
                        Top companies receive thousands of resumes. 75% are rejected by automated ATS before a human ever sees them. We fix that.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard 
                        delay={0.2}
                        title="ATS Optimization"
                        icon="🎯"
                        desc="Our algorithm mimics Fortune 500 hiring systems to flag missing keywords, formatting issues, and readability scores instantly."
                    />
                    <FeatureCard 
                        delay={0.4}
                        title="Smart Question Bank"
                        icon="🧠"
                        desc="Stop memorizing random leetcode. Get curated questions based on the specific job description and role requirements."
                    />
                     <FeatureCard 
                        delay={0.6}
                        title="Instant Feedback"
                        icon="⚡"
                        desc="Get detailed explanations for every wrong answer. Learn the 'why' behind the logic, not just the solution."
                    />
                </div>
            </div>
        </div>
    );
};

const HowItWorksSection = () => {
    return (
        <div className="py-20 md:py-32 bg-slate-900 border-y border-slate-800">
            <div className="container mx-auto px-6 md:px-12 lg:px-24 grid lg:grid-cols-2 gap-20 items-center">
                
                {/* Visual Side */}
                <div className="relative order-2 lg:order-1">
                     <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
                     <div className="relative bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <div className="space-y-6">
                            {/* Fake Chat UI */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0"></div>
                                <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none text-slate-300 text-sm">
                                    I found 3 critical issues in your React hooks implementation. Here's how to fix them...
                                </div>
                            </div>
                             <div className="flex gap-4 flex-row-reverse">
                                <div className="w-10 h-10 rounded-full bg-purple-500 flex-shrink-0"></div>
                                <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-2xl rounded-tr-none text-white text-sm">
                                    Wow, I didn't know that about useEffect! Thanks.
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0"></div>
                                <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none text-slate-300 text-sm">
                                    Now let's try a system design question. How would you design a rate limiter?
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Steps Side */}
                <div className="order-1 lg:order-2">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">Your path to hired.</h2>
                    <div className="pl-4">
                        <StepItem 
                            number="1"
                            title="Upload Resume"
                            desc="Drag and drop your PDF. Our secure engine parses your skills, experience, and projects in seconds."
                        />
                         <StepItem 
                            number="2"
                            title="Get Matched"
                            desc="We cross-reference your profile with live job market data to find roles you're actually qualified for."
                        />
                         <StepItem 
                            number="3"
                            title="Prep & Practice"
                            desc="Enter the simulation. Take timed technical quizzes and logic tests designed to mimic the real pressure."
                        />
                         <StepItem 
                            number="4"
                            title="Apply with Confidence"
                            desc="Use our insights to tweak your application and walk into the interview room ready to dominate."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContactSection = ({ user, setPage }) => {
    const [status, setStatus] = useState('');
    const [message, setMessage] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(false);
    
    // Local state for non-logged in users (visual only, since they must login to send)
    const [localName, setLocalName] = useState('');
    const [localEmail, setLocalEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        setStatus('sending');
        try {
            await axios.post('/contact', {
                user_id: user?.id || 0,
                user_name: user?.full_name || localName,
                user_email: user?.email || localEmail,
                content: message
            });
            setStatus('sent');
            setMessage('');
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to send message: ${errMsg}`);
            setStatus('');
        }
    };

    return (
        <div className="py-20 md:py-24 relative bg-slate-950 overflow-hidden border-t border-slate-800">
            {/* Login Popup Modal */}
            <AnimatePresence>
                {showLoginModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setShowLoginModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
                            <p className="text-slate-400 mb-6 text-sm">Please sign in to your account to send direct messages to our support team.</p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowLoginModal(false)}
                                    className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => setPage('auth')}
                                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors text-sm shadow-lg shadow-blue-500/20"
                                >
                                    Sign In
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-6 md:px-12 lg:px-24 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    
                    {/* Text Side */}
                    <div>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Let's shape your future together.</h2>
                        <p className="text-xl text-slate-400 mb-8">
                            Have questions about our AI models or enterprise pricing? Drop us a line and our team will get back to you within 24 hours.
                        </p>
                        
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <div className="text-white font-semibold">Email Us</div>
                                    <div className="text-slate-500">support@careerlaunchpad.ai</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <div>
                                    <div className="text-white font-semibold">HQ Location</div>
                                    <div className="text-slate-500">Changanacherry, Kerala</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Side */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {status === 'sent' ? (
                             <div className="h-[400px] flex flex-col items-center justify-center text-center animate-fade-in-up">
                                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                                <p className="text-slate-400">We'll be in touch with you at <span className="text-blue-400">{user?.email || localEmail}</span> shortly.</p>
                                <button onClick={() => setStatus('')} className="mt-8 text-blue-400 hover:text-blue-300 font-medium">Send another</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10 transition-all duration-300">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Your Name</label>
                                        <input 
                                            value={user ? user.full_name : localName} 
                                            onChange={e => !user && setLocalName(e.target.value)}
                                            disabled={!!user}
                                            type="text" 
                                            className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 ${user ? 'opacity-70 cursor-not-allowed' : ''}`} 
                                            placeholder="John Doe" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Email Address</label>
                                        <input 
                                            value={user ? user.email : localEmail} 
                                            onChange={e => !user && setLocalEmail(e.target.value)}
                                            disabled={!!user}
                                            type="email" 
                                            className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 ${user ? 'opacity-70 cursor-not-allowed' : ''}`} 
                                            placeholder="john@company.com" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Message</label>
                                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows="4" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="How can we help you?"></textarea>
                                </div>

                                <button 
                                    disabled={status === 'sending'}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
                                >
                                    {status === 'sending' ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (user ? 'Send Message' : 'Login to Send')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Home = ({ setPage, user }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-purple-500/30">
            <HeroSection setPage={setPage} />
            <AboutSection />
            <HowItWorksSection />
            <ContactSection user={user} setPage={setPage} />
        </div>
    );
};

export default Home;
