import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileModal from './ProfileModal';

// Shared Avatar definition
const AVATARS = [
    { id: 1, type: 'initials', color: 'from-blue-500 to-purple-600' },
    { id: 2, type: 'emoji', content: '👨‍💻', color: 'from-emerald-400 to-cyan-500' },
    { id: 3, type: 'emoji', content: '🚀', color: 'from-orange-400 to-red-500' },
    { id: 4, type: 'emoji', content: '⚡', color: 'from-yellow-400 to-orange-500' },
    { id: 5, type: 'emoji', content: '🤖', color: 'from-indigo-400 to-purple-500' },
    { id: 6, type: 'emoji', content: '😼', color: 'from-pink-400 to-rose-500' },
];

const Navbar = ({ setCurrentPage, currentPage, user, setUser }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const dropdownRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsDropdownOpen(false);
        }, 300);
    };

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentPage]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    // Helper to safely get avatar
    const getAvatar = () => {
        if (!user) return null;
        const id = parseInt(user.avatar_id || user.avatarId || 1); 
        return AVATARS.find(a => a.id === id) || AVATARS[0];
    };

    const currentAvatar = getAvatar();

    const navItems = ['Home', 'Resume Scan', 'ATS Checker', 'Interview Prep'];

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 support-backdrop-blur:bg-slate-900/90">
                <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    {/* Brand */}
                    <div 
                        className="flex items-center gap-2 cursor-pointer z-50" 
                        onClick={() => setCurrentPage('home')}
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-sans tracking-tight">
                            LaunchPad
                        </span>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-800/50 p-1 rounded-full border border-white/5">
                        {navItems.map((item) => {
                            const page = item.toLowerCase().replace(' ', '').replace('scan', '').replace('checker', '').replace('prep', '');
                            const pageKey = page === 'resume' ? 'resume' : (page === 'ats' ? 'ats' : (page === 'interview' ? 'interview' : 'home'));
                            const isActive = currentPage === pageKey;
                            return (
                                <button 
                                    key={item}
                                    onClick={() => setCurrentPage(pageKey)}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3 md:gap-4 z-50">
                        {user ? (
                            <div 
                                className="relative" 
                                ref={dropdownRef}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                <button 
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 md:gap-3 focus:outline-none group p-1 pr-4 rounded-full hover:bg-slate-800 transition-all duration-300 border border-transparent hover:border-slate-700"
                                >
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-bold text-white leading-none group-hover:text-blue-400 transition-colors">{user.full_name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">PRO ACCOUNT</p>
                                    </div>
                                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-white font-bold border border-white/10 shadow-lg group-hover:shadow-blue-500/20 transition-all bg-gradient-to-br ${currentAvatar?.color}`}>
                                        {currentAvatar?.type === 'initials' 
                                            ? user.full_name?.charAt(0).toUpperCase() 
                                            : <span className="text-lg md:text-xl">{currentAvatar?.content}</span>
                                        }
                                    </div>
                                </button>

                                {/* Desktop Dropdown */}
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: "circOut" }}
                                            className="absolute right-0 top-full mt-3 w-72 bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 origin-top-right ring-1 ring-white/10"
                                        >
                                            <div className="p-5 border-b border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                                                <p className="text-white font-bold truncate text-base">{user.full_name}</p>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-500/20">Pro Member</span>
                                                </div>
                                            </div>
                                            
                                            <div className="p-2 space-y-1">
                                                <button 
                                                    onClick={() => { setIsProfileOpen(true); setIsDropdownOpen(false); }}
                                                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all flex items-center gap-3 group"
                                                >
                                                    <div className="p-1.5 bg-slate-800 rounded-lg group-hover:bg-blue-600 transition-colors">
                                                        <svg className="w-4 h-4 text-blue-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    </div>
                                                    My Profile
                                                </button>
                                                {user.role === 'admin' && (
                                                    <button 
                                                        onClick={() => { setCurrentPage('admin'); setIsDropdownOpen(false); }}
                                                        className="w-full text-left px-4 py-3 text-sm text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-xl transition-all flex items-center gap-3 group"
                                                    >
                                                        <div className="p-1.5 bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500/30 transition-colors">
                                                            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                        </div>
                                                        Admin Panel
                                                    </button>
                                                )}
                                                <div className="h-px bg-slate-800/50 mx-2 my-1"></div>
                                                <button 
                                                    onClick={() => { 
                                                        localStorage.removeItem('user'); 
                                                        setUser(null); 
                                                        setIsDropdownOpen(false); 
                                                        setCurrentPage('home'); 
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-3 group"
                                                >
                                                    <div className="p-1.5 bg-slate-800 rounded-lg group-hover:bg-red-500/20 transition-colors">
                                                        <svg className="w-4 h-4 text-slate-400 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    </div>
                                                    Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setCurrentPage('auth')}
                                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                Get Started
                            </button>
                        )}

                        {/* Mobile Toggle Button */}
                        <button 
                            className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800/50 rounded-lg border border-white/10"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                            className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-white/10 overflow-hidden shadow-2xl"
                        >
                            <div className="flex flex-col p-4 space-y-2">
                                {navItems.map((item) => {
                                    const page = item.toLowerCase().replace(' ', '').replace('scan', '').replace('checker', '').replace('prep', '');
                                    const pageKey = page === 'resume' ? 'resume' : (page === 'ats' ? 'ats' : (page === 'interview' ? 'interview' : 'home'));
                                    const isActive = currentPage === pageKey;
                                    return (
                                        <button 
                                            key={item}
                                            onClick={() => { setCurrentPage(pageKey); setIsMobileMenuOpen(false); }}
                                            className={`w-full text-left px-5 py-4 text-base font-medium rounded-xl transition-all duration-200 flex items-center justify-between group ${
                                                isActive 
                                                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent active:scale-[0.98]'
                                            }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                {/* Optional icons based on item could go here, but keeping it clean text is professional too. */}
                                                {item}
                                            </span>
                                            {isActive ? (
                                                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                                            ) : (
                                                <svg className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Profile Modal */}
            <AnimatePresence>
                {isProfileOpen && user && (
                    <ProfileModal 
                        user={user} 
                        setUser={setUser} 
                        onClose={() => setIsProfileOpen(false)} 
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
