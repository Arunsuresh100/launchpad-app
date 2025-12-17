import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// Force Frontend Build Update V3 - Final UI Polish
const AdminDashboard = ({ user, setPage, setUser }) => {
    const [stats, setStats] = useState({ total_users: 0, active_users: 0, total_resumes: 0 });
    const [users, setUsers] = useState([]);
    const [deletedUsers, setDeletedUsers] = useState([]); 
    const [jobs, setJobs] = useState([]);
    const [analytics, setAnalytics] = useState({ resume_uploads: 0, ats_checks: 0, interviews_attended: 0, recent_activities: [] }); // Default State
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [notification, setNotification] = useState('');
    
    // Job Form State
    const [showJobForm, setShowJobForm] = useState(false);
    const [editingJob, setEditingJob] = useState(null); // ID of job being edited
    const [jobForm, setJobForm] = useState({
        title: '', company: '', location: '', description: '', 
        skills_required: '', contract_type: 'full_time', url: '', date_posted: '' 
    });
    
    // Modal States
    const [deleteUserModal, setDeleteUserModal] = useState({ open: false, id: null, name: '' });
    const [permDeleteModal, setPermDeleteModal] = useState({ open: false, id: null, name: '' });
    const [clearLogsModal, setClearLogsModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null }); // Message Delete
    const [deleteJobModal, setDeleteJobModal] = useState({ open: false, id: null, title: '' }); // Job Delete

    const [logs, setLogs] = useState([]); 
    const [messages, setMessages] = useState([]); 
    const [searchQuery, setSearchQuery] = useState('');
    
    // Reply Modal State
    const [replyModal, setReplyModal] = useState({ open: false, msgId: null, userEmail: null, userName: null });
    const [replyForm, setReplyForm] = useState({ subject: '', content: '' });
    const [replyStatus, setReplyStatus] = useState('');

    useEffect(() => {
        // Security Check
        if (!user || user.role !== 'admin') {
            setPage('home');
            return;
        }

        fetchData();
        // Poll for live status every 5 seconds (Real-time feel)
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const fetchData = async () => {
        try {
            // Unpack responses
            const [statsRes, usersRes, deletedUsersRes, jobsRes, logsRes, msgsRes, analyticsRes] = await Promise.all([
                axios.get('/admin/stats'),
                axios.get('/admin/users'),
                axios.get('/admin/users/deleted'),
                axios.get('/admin/jobs'),
                axios.get('/admin/logs'),
                axios.get('/admin/messages'),
                axios.get('/admin/analytics')
            ]);
            
            // HELPER: Format UTC Date to Local string correctly
            // HELPER: Format UTC Date to India Standard Time (IST)
            const formatDate = (dateStr) => {
                if (!dateStr) return 'Never';
                const safeDate = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
                return new Date(safeDate).toLocaleString('en-IN', { 
                    timeZone: 'Asia/Kolkata',
                    month: 'short', day: 'numeric', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit', hour12: true 
                });
            };

            // Process Users: Add 'is_online' flag AND Sort (Online first, then Last Active)
            const processUsers = (rawUsers) => {
                const processed = rawUsers.map(u => ({
                    ...u,
                    is_online: u.last_active && (new Date() - new Date(u.last_active.endsWith('Z') ? u.last_active : u.last_active + 'Z') < 1 * 60 * 1000)
                }));
                // Sort: Online > Offline, then by Date Descending
                return processed.sort((a, b) => {
                    if (a.is_online === b.is_online) {
                        return new Date(b.last_active || 0) - new Date(a.last_active || 0);
                    }
                    return a.is_online ? -1 : 1; 
                });
            };

            setStats(statsRes.data);
            setUsers(processUsers(usersRes.data));
            
            // Ensure deleted users are sorted DESC by deletion/active date
            const sortedDeleted = [...deletedUsersRes.data].sort((a,b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
            setDeletedUsers(sortedDeleted);
            
            setJobs(jobsRes.data);
            setLogs(logsRes.data);
            setMessages(msgsRes.data);
            setAnalytics(analyticsRes.data); // Set Analytics
            
            return { formatDate }; 
            
        } catch (err) {
            console.error("Admin Fetch Error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetAnalytics = async () => {
        if (window.confirm("WARNING: This will delete ALL Analytics data (uploads, interviews, scans). This cannot be undone.")) {
            try {
                await axios.delete('/admin/analytics');
                alert("Analytics data reset successfully.");
                fetchData(); // Refresh
            } catch (e) {
                console.error(e);
                alert("Failed to reset data.");
            }
        }
    };
    
    // Re-define helper for render scope
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never';
        const safeDate = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        return new Date(safeDate).toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    };

    const showNotification = (msg, type='success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(''), 3000);
    };
    
    const handleJobSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingJob) {
                await axios.put(`/admin/jobs/${editingJob}`, jobForm);
                showNotification("Job updated successfully.");
                setEditingJob(null);
            } else {
                await axios.post('/admin/jobs', jobForm);
                showNotification("Job posted successfully.");
            }
            setShowJobForm(false);
            setJobForm({ title: '', company: '', location: '', description: '', skills_required: '', contract_type: 'full_time', url: '', date_posted: ''});
            fetchData();
        } catch (err) {
            console.error(err);
            // Handle specific backend error for date validation
            const msg = err.response?.data?.detail || "Failed to save job.";
            showNotification(msg, 'error');
        }
    };

    // New Delete Handler using Modal
    const handleDeleteJob = (id, title) => {
        setDeleteJobModal({ open: true, id, title });
    };

    const confirmDeleteJob = async () => {
        if (!deleteJobModal.id) return;
        try {
            await axios.delete(`/admin/jobs/${deleteJobModal.id}`);
            showNotification("Job deleted successfully.");
            fetchData();
            setDeleteJobModal({ open: false, id: null, title: '' });
        } catch (err) {
            console.error(err);
            showNotification("Failed to delete job.", 'error');
        }
    };
    // User Soft Delete Handlers
    const [deleteReason, setDeleteReason] = useState('');
    const [validationMsg, setValidationMsg] = useState('');
    
    const handleSoftDeleteUser = async () => {
        if (!deleteReason.trim()) {
            setValidationMsg("Reason is compulsory!");
            setTimeout(() => setValidationMsg(''), 2000);
            return;
        }
        try {
            await axios.post(`/admin/users/${deleteUserModal.id}/delete`, { reason: deleteReason });
            showNotification(`User deleted.`);
            setDeleteUserModal({ open: false, id: null, name: '' });
            setDeleteReason('');
            fetchData();
        } catch (err) {
            console.error(err);
            showNotification("Failed to delete user.", 'error');
        }
    };

    const handleRestoreUser = async (id) => {
        try {
            await axios.post(`/admin/users/${id}/restore`);
            showNotification(`User restored.`);
            fetchData();
        } catch (err) {
             console.error(err);
             showNotification("Failed to restore user.", 'error');
        }
    };
    
    const handlePermanentDelete = async () => {
        if (!permDeleteModal.id) return;
        try {
             await axios.delete(`/admin/users/${permDeleteModal.id}/permanent`);
             showNotification(`User PERMANENTLY deleted.`);
             setPermDeleteModal({ open: false, id: null, name: '' });
             fetchData();
        } catch (err) {
             console.error(err);
             showNotification("Failed to delete user permanently.", 'error');
        }
    };
    
    // Logs Clear
    // Logs Clear

    const handleClearLogs = async () => {
        setClearLogsModal(false);
        try {
            await axios.delete('/admin/logs');
            showNotification("Logs cleared.");
            fetchData();
        } catch (err) {
            console.error(err);
            showNotification("Failed to clear logs.", 'error');
        }
    };

    // Message Delete State
    // Message Delete State


    const handleDeleteMessage = (id) => {
        setDeleteModal({ open: true, id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await axios.delete(`/admin/messages/${deleteModal.id}`);
            showNotification(`Message deleted.`);
            setMessages(messages.filter(m => m.id !== deleteModal.id));
            setDeleteModal({ open: false, id: null });
        } catch (err) {
            console.error(err);
            showNotification("Failed to delete message.", 'error');
        }
    };
    
    // Reply Handlers...
    const handleOpenReply = (msg) => {
        setReplyModal({ open: true, msgId: msg.id, userEmail: msg.user_email, userName: msg.user_name });
        setReplyForm({ subject: `Re: Inquiry from ${msg.user_name}`, content: `Hi ${msg.user_name},\n\nThank you for reaching out.\n\nBest regards,\nCareerLaunchpad Team` });
        setReplyStatus('');
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        setReplyStatus('sending');
        try {
            const res = await axios.post('/admin/reply', {
                user_email: replyModal.userEmail,
                subject: replyForm.subject,
                content: replyForm.content,
                original_message_id: replyModal.msgId
            });
            
            if (res.data.message && (res.data.message.includes("Mocked") || res.data.message.includes("requires SMTP"))) {
                 showNotification("Opening Gmail...", 'warning');
                 setTimeout(() => {
                     const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(replyModal.userEmail)}&su=${encodeURIComponent(replyForm.subject)}&body=${encodeURIComponent(replyForm.content)}`;
                     window.open(gmailUrl, '_blank');
                 }, 500);
            } else {
                showNotification(`Reply sent to ${replyModal.userEmail}`);
            }
            
            setReplyModal({ open: false, msgId: null, userEmail: null, userName: null });
            fetchData(); // Update replied status
        } catch (err) {
            console.error(err);
            setReplyStatus('error');
             showNotification("Email failed. Opening Gmail...", 'warning');
             setTimeout(() => {
                 const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(replyModal.userEmail)}&su=${encodeURIComponent(replyForm.subject)}&body=${encodeURIComponent(replyForm.content)}`;
                 window.open(gmailUrl, '_blank');
             }, 1000);
        }
    };
    
    // Filter users
    const filteredUsers = users.filter(u => 
        u.role !== 'admin' && 
        (u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Split Messages Logic
    const pendingMessages = messages.filter(m => !m.is_replied).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const repliedMessages = messages.filter(m => m.is_replied).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 relative pb-20 md:pb-0">
             <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 border px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 ${
                            notification.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-white' : 
                            notification.type === 'warning' ? 'bg-yellow-900/90 border-yellow-500/50 text-white' : 
                            'bg-slate-800/90 border-slate-600/50 text-white'
                        }`}
                    >
                        <span className={`text-xl ${notification.type === 'error' ? 'text-red-400' : notification.type === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                            {notification.type === 'error' ? '⚠' : notification.type === 'warning' ? '!' : '✓'}
                        </span>
                        <span className="font-medium text-sm md:text-base whitespace-nowrap">{notification.msg || notification}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* PERMANENT DELETE MODAL */}
            <AnimatePresence>
                {permDeleteModal.open && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
                        onClick={() => setPermDeleteModal({open: false, id: null, name: ''})}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-red-500/40 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden ring-4 ring-red-500/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/40 animate-pulse">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2 text-center">Permanently Delete?</h3>
                            <p className="text-slate-400 text-center mb-6">User <span className="text-red-400 font-bold">{permDeleteModal.name}</span> will be wiped from the database. <br/>This action is <span className="text-red-400 font-bold underline">IRREVERSIBLE</span>.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setPermDeleteModal({open: false, id: null, name: ''})} className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                                <button onClick={handlePermanentDelete} className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/40 transition-all">
                                    YES, DELETE FOREVER
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear Logs Modal - Professional */}
             <AnimatePresence>
                {clearLogsModal && (
                   <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
                        onClick={() => setClearLogsModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl max-w-sm w-full shadow-2xl relative"
                            onClick={e=>e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto ring-1 ring-red-500/20">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 text-center">Clear System Logs?</h3>
                            <p className="text-slate-400 text-sm mb-8 text-center leading-relaxed">This will permanently delete all logs history.<br/>This action cannot be undone.</p>
                            <div className="flex gap-4">
                                <button onClick={()=>setClearLogsModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-colors">Cancel</button>
                                <button onClick={handleClearLogs} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition-all">Yes, Clear All</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar - Updated Title */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 supports-backdrop-blur:bg-slate-900/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/admin-logo.png" alt="Logo" className="w-8 h-8 rounded-lg bg-slate-800" />
                        <h1 className="text-lg font-bold text-white tracking-tight">Admin <span className="text-blue-500">Panel</span></h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-full border border-slate-700">
                             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Online</span>
                        </div>
                        <button onClick={() => { localStorage.removeItem('user'); setUser(null); setPage('home'); }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg md:hidden">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                        <button onClick={() => { localStorage.removeItem('user'); setUser(null); setPage('home'); }} className="hidden md:block text-sm text-slate-400 hover:text-white transition-colors">Log Out</button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up">
                {/* Tabs */}
                <div className="flex gap-2 md:gap-4 border-b border-slate-800 pb-1 overflow-x-auto no-scrollbar mask-linear">
                    {['overview', 'analytics', 'jobs', 'deleted_users', 'messages', 'logs'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-white'}`}>
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Total Users" value={stats.total_users} icon={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="blue" />
                            <StatCard title="Active Now" value={stats.active_users} icon={<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>} color="green" />
                            <StatCard title="Active Jobs" value={jobs.length} icon={<svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} color="purple" />
                        </div>


                        <AnimatePresence>
                            {deleteUserModal.open && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
                                    onClick={() => setDeleteUserModal({open: false, id: null, name: ''})}
                                >
                                    <motion.div 
                                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                        transition={{ type: "spring", duration: 0.5 }}
                                        className="bg-slate-900 border border-red-500/20 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
                                        
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20">
                                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        </div>
                                        
                                        <div className="text-center mb-6">
                                            <h3 className="text-2xl font-bold text-white mb-2">Delete User?</h3>
                                            <p className="text-slate-400">Are you sure you want to delete <span className="text-white font-bold">{deleteUserModal.name}</span>?</p>
                                        </div>

                                        <div className="mb-8 relative">
                                            <label className="block text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 text-left">Reason (Required)</label>
                                            <textarea 
                                                value={deleteReason} 
                                                onChange={e => { setDeleteReason(e.target.value); setValidationMsg(''); }}
                                                className={`w-full bg-slate-950 border ${validationMsg ? 'border-red-500' : 'border-slate-800'} rounded-2xl p-4 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none transition-all placeholder:text-slate-600`}
                                                rows="3"
                                                placeholder="e.g. Violation of terms..."
                                                autoFocus
                                            ></textarea>
                                            {validationMsg && <motion.span initial={{opacity:0, y:-10}} animate={{opacity:1,y:0}} className="text-xs text-red-500 absolute -bottom-6 left-0 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {validationMsg}
                                            </motion.span>}
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => setDeleteUserModal({open: false, id: null, name: ''})} className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                                            <button onClick={handleSoftDeleteUser} className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition-all">
                                                Delete User
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/30">
                                <h2 className="text-lg md:text-xl font-bold text-white">User Management</h2>
                                <div className="relative group w-full md:w-auto">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <input 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        type="text" 
                                        placeholder="Search users..." 
                                        className="block w-full md:w-64 pl-9 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-950 text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider">
                                        <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Last Active</th><th className="px-6 py-4">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">{u.full_name?.charAt(0) || "U"}</div>
                                                        <div><p className="font-medium text-white">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-700/50 text-slate-300 border border-slate-600/50 text-xs font-bold uppercase">User</span></td>
                                                <td className="px-6 py-4">{u.is_online ? <span className="inline-flex items-center gap-1.5 text-green-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Online</span> : <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>Offline</span>}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{formatDate(u.last_active)}</td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => setDeleteUserModal({ open: true, id: u.id, name: u.full_name })} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No users found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2 p-3">
                                {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                                    <div key={u.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                 <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white">{u.full_name?.charAt(0) || "U"}</div>
                                                 {u.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full"></div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{u.full_name}</p>
                                                <p className="text-xs text-slate-500">{u.email}</p>
                                                <p className="text-[10px] text-slate-600 mt-0.5">{u.last_active ? new Date(u.last_active).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Never Active'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setDeleteUserModal({ open: true, id: u.id, name: u.full_name })} className="p-2 bg-slate-800 text-red-400 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                )) : <div className="text-center p-6 text-slate-500">No users found</div>}
                            </div>
                        </div>
                    </>
                )}
                
                {/* ANALYTICS TAB CONTENT */}
                {activeTab === 'analytics' && analytics && (
                    <div className="space-y-8">
                        <h2 className="text-xl font-bold text-white mb-4">Detailed Analytics</h2>
                        
                        {/* 3 CIRCLES ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Circle 1: Resume Uploads */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overlow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="56" cx="50%" cy="50%" />
                                        <circle className="text-blue-500 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={351} strokeDashoffset={351 - (351 * Math.min(analytics.resume_uploads, 100)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="56" cx="50%" cy="50%" />
                                    </svg>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                        <span className="text-3xl font-bold text-white block">{analytics.resume_uploads}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Uploads</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 text-center">Resumes Uploaded (Job Search)</p>
                            </div>

                            {/* Circle 2: ATS Checks */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overlow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="56" cx="50%" cy="50%" />
                                        <circle className="text-purple-500 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={351} strokeDashoffset={351 - (351 * Math.min(analytics.ats_checks, 100)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="56" cx="50%" cy="50%" />
                                    </svg>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                        <span className="text-3xl font-bold text-white block">{analytics.ats_checks}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Scans</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 text-center">ATS Checks Performed</p>
                            </div>

                            {/* Circle 3: Interviews */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overlow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="56" cx="50%" cy="50%" />
                                        <circle className="text-green-500 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={351} strokeDashoffset={351 - (351 * Math.min(analytics.interviews_attended, 100)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="56" cx="50%" cy="50%" />
                                    </svg>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                        <span className="text-3xl font-bold text-white block">{analytics.interviews_attended}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Interviews</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 text-center">Mock Interviews Completed</p>
                            </div>
                        </div>



                        {/* DAILY ACTIVITY GRAPH */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Daily User Activity (Last 7 Days)</h3>
                            <div className="h-64 flex items-end justify-between gap-2 px-4 pb-4 border-b border-l border-slate-700/50 relative">
                                {analytics.daily_stats && analytics.daily_stats.length > 0 ? (
                                    <>
                                        {/* Y-Axis Guidelines */}
                                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-10">
                                            {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white"></div>)}
                                        </div>
                                        
                                        {analytics.daily_stats.map((stat, i) => {
                                            const maxUsers = Math.max(...analytics.daily_stats.map(s => s.users), 10);
                                            const heightPerc = (stat.users / maxUsers) * 100;
                                            return (
                                                <div key={i} className="flex flex-col items-center gap-2 group w-full">
                                                    <div className="relative w-full flex justify-center h-full items-end">
                                                        <div 
                                                            className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all duration-1000 ease-out hover:opacity-80 relative"
                                                            style={{ height: `${Math.max(heightPerc, 2)}%` }}
                                                        >
                                                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {stat.users}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-mono rotate-0 whitespace-nowrap">{new Date(stat.date).toLocaleDateString(undefined, {weekday:'short'})}</span>
                                                </div>
                                            )
                                        })}
                                    </>
                                ) : (
                                    <p className="w-full text-center text-slate-500 self-center">No daily data available</p>
                                )}
                            </div>
                        </div>

                        {/* RESUME UPLOADS TABLE (User Details & Files) */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Resume Uploads & Files
                                </h3>
                                <div className="flex gap-3">
                                    <button onClick={handleResetAnalytics} className="text-xs text-red-500 hover:text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 transition-colors">Reset Data</button>
                                    <button onClick={fetchData} className="text-xs text-blue-400 hover:text-white transition-colors">Refresh</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 w-1/4">User Name / Email</th>
                                            <th className="px-6 py-4">Uploaded File Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {analytics.resume_details && analytics.resume_details.length > 0 ? (
                                            Object.entries(analytics.resume_details.reduce((acc, curr) => {
                                                (acc[curr.user_name] = acc[curr.user_name] || []).push(curr);
                                                return acc;
                                            }, {})).map(([userName, files], grpIdx) => (
                                                <tr key={grpIdx} className="hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-white align-top border-r border-slate-800/50 bg-slate-900/50">
                                                        <div className="sticky top-0">
                                                            {userName}
                                                            {files[0].user_email && (
                                                                <span className="block text-[11px] text-blue-400 font-normal mt-0.5 mb-1">{files[0].user_email}</span>
                                                            )}
                                                            <span className="block text-[10px] text-slate-500 font-normal mt-1">{files.length} Uploads</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-0">
                                                        <table className="w-full">
                                                            <tbody>
                                                                {files.map((file, fIdx) => (
                                                                    <tr key={fIdx} className={fIdx !== files.length -1 ? "border-b border-slate-800/30" : ""}>
                                                                        <td className="px-6 py-3 w-1/3">
                                                                            <div className="flex items-center gap-2">
                                                                                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                                                <span className="text-slate-300 text-sm truncate max-w-[200px]" title={file.filename}>{file.filename}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 w-1/4 text-xs font-mono text-slate-500 whitespace-nowrap">
                                                                            {formatDate(file.date)}
                                                                        </td>
                                                                        <td className="px-6 py-3 text-right">
                                                                            {file.saved_path ? (
                                                                                <a 
                                                                                    href={`/uploads/${file.saved_path}`} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 rounded-md text-xs font-bold transition-all uppercase inline-flex items-center gap-1"
                                                                                >
                                                                                    View
                                                                                </a>
                                                                            ) : <span className="text-slate-600 text-xs italic">N/A</span>}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="2" className="text-center py-8 text-slate-500">No resumes uploaded recently.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'jobs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-xl md:text-2xl font-bold text-white">Job Management</h2></div>
                            <button onClick={() => { 
                                if (showJobForm) {
                                  // Reset form and close
                                  setEditingJob(null);
                                  setJobForm({ title: '', company: '', location: '', description: '', skills_required: '', contract_type: 'full_time', url: '', date_posted: ''});
                                  setShowJobForm(false);
                                } else {
                                  // Open form for new job
                                  setEditingJob(null);
                                  setJobForm({ title: '', company: '', location: '', description: '', skills_required: '', contract_type: 'full_time', url: '', date_posted: ''});
                                  setShowJobForm(true);
                                }
                            }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                                {showJobForm ? (editingJob ? 'Cancel Edit' : 'Cancel') : '+ New Job'}
                            </button>
                        </div>

                        <AnimatePresence>
                        {showJobForm && (
                            <motion.form initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} onSubmit={handleJobSubmit} className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl space-y-4 overflow-hidden">
                                <h3 className="text-lg font-bold text-white mb-2">{editingJob ? 'Edit Job' : 'Create New Job'}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input value={jobForm.title} onChange={e=>setJobForm({...jobForm, title: e.target.value})} placeholder="Job Title *" required className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                    <input value={jobForm.company} onChange={e=>setJobForm({...jobForm, company: e.target.value})} placeholder="Company *" required className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input value={jobForm.location} onChange={e=>setJobForm({...jobForm, location: e.target.value})} placeholder="Location *" required className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                    <select value={jobForm.contract_type} onChange={e=>setJobForm({...jobForm, contract_type: e.target.value})} className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full">
                                        <option value="full_time">Full Time</option>
                                        <option value="internship">Internship</option>
                                    </select>
                                </div>
                                <textarea value={jobForm.description} onChange={e=>setJobForm({...jobForm, description: e.target.value})} placeholder="Job Description *" required className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full h-24"/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <input value={jobForm.skills_required} onChange={e=>setJobForm({...jobForm, skills_required: e.target.value})} placeholder="Skills (comma separated)" className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                     <input value={jobForm.url} onChange={e=>setJobForm({...jobForm, url: e.target.value})} placeholder="Application URL (Required) *" required className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-xs text-gray-400 mb-1 ml-1">Date Posted (Visible From)</label>
                                        <input 
                                            type="date" 
                                            value={jobForm.date_posted ? jobForm.date_posted.split('T')[0] : new Date().toISOString().split('T')[0]} 
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e=>setJobForm({...jobForm, date_posted: e.target.value})} 
                                            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg">
                                    {editingJob ? 'Update Job' : 'Publish Job'}
                                </button>
                            </motion.form>
                        )}
                        </AnimatePresence>
                        
                        <div className="grid grid-cols-1 gap-4">
                             {jobs.map((job) => (
                                <div key={job.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4 group hover:border-slate-700 transition-all">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{job.title} <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ml-2 ${job.contract_type === 'internship' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>{job.contract_type === 'internship' ? 'Intern' : 'Full Time'}</span></h3>
                                        <p className="text-sm text-slate-400">{job.company} • {job.location}</p>
                                        <p className="text-xs text-slate-500 mt-1">Posted: {formatDate(job.date_posted)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={()=>{
                                                setJobForm({
                                                    title: job.title,
                                                    company: job.company,
                                                    location: job.location,
                                                    description: job.description,
                                                    skills_required: job.skills_required,
                                                    contract_type: job.contract_type,
                                                    url: job.url,
                                                    date_posted: job.date_posted // Keep original date
                                                });
                                                setEditingJob(job.id);
                                                setShowJobForm(true);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors text-sm font-medium border border-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button onClick={() => setDeleteJobModal({ open: true, id: job.id, title: job.title })} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500/10">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                             ))}
                             {jobs.length === 0 && <p className="text-slate-500 text-center py-8">No jobs posted yet.</p>}
                        </div>

                        {/* Delete Job Modal */}
                        <AnimatePresence>
                            {deleteJobModal.open && (
                                <motion.div 
                                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" 
                                    onClick={() => setDeleteJobModal({ open: false, id: null, title: '' })}
                                >
                                    <motion.div 
                                        initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} 
                                        className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative" 
                                        onClick={e => e.stopPropagation()}
                                    >
                                         <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 mx-auto ring-1 ring-red-500/20">
                                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">Delete Job?</h3>
                                        <p className="text-slate-400 text-sm mb-6">Are you sure you want to delete <span className="text-white font-medium">"{deleteJobModal.title}"</span>?</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => setDeleteJobModal({ open: false, id: null, title: '' })} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                                            <button onClick={confirmDeleteJob} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/20">Delete</button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
                
                {activeTab === 'deleted_users' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                         <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                            <h2 className="text-lg md:text-xl font-bold text-white">Archives</h2>
                            <span className="text-slate-500 text-sm">{deletedUsers.length} total</span>
                        </div>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider">
                                    <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Reason</th><th className="px-6 py-4">Last Active</th><th className="px-6 py-4">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {deletedUsers.length > 0 ? deletedUsers.map((u) => (
                                        <tr key={u.id}>
                                            <td className="px-6 py-4"><div><p className="font-medium text-slate-300">{u.full_name}</p><p className="text-xs text-slate-600">{u.email}</p></div></td>
                                            <td className="px-6 py-4 flex-1 break-words max-w-xs">{u.deletion_reason || 'No reason'}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{formatDate(u.deleted_at)}</td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button onClick={() => handleRestoreUser(u.id)} className="px-3 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20 text-xs font-bold uppercase hover:bg-green-500/20 transition-colors">Restore</button>
                                                <button onClick={() => setPermDeleteModal({open: true, id: u.id, name: u.full_name})} className="p-1.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 hover:bg-red-500/20 transition-colors" title="Permanently Delete">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No deleted users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile List */}
                         <div className="md:hidden space-y-2 p-3">
                                {deletedUsers.length > 0 ? deletedUsers.map((u) => (
                                    <div key={u.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <div className="flex justify-between items-start mb-2">
                                             <div>
                                                <p className="font-bold text-slate-300 text-sm">{u.full_name}</p>
                                                <p className="text-xs text-slate-600">{u.email}</p>
                                             </div>
                                             <div className="flex gap-2">
                                                <button onClick={() => handleRestoreUser(u.id)} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 text-xs font-bold uppercase">Restore</button>
                                                <button onClick={() => setPermDeleteModal({open: true, id: u.id, name: u.full_name})} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20" title="Delete Forever">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                             </div>
                                        </div>
                                        <div className="text-xs text-slate-500 bg-slate-900 p-2 rounded border border-slate-800 mb-2">
                                            <span className="text-slate-400 font-bold">Reason:</span> {u.deletion_reason || 'No reason'}
                                        </div>
                                        <p className="text-[10px] text-slate-600 text-right">Last Active: {formatDate(u.deleted_at)}</p>
                                    </div>
                                )) : <div className="text-center p-6 text-slate-500">No deleted users.</div>}
                         </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="space-y-8 min-h-[600px] relative">
                        {/* Modals are shared and professional */}
                         <AnimatePresence>
                            {deleteModal.open && (
                                <motion.div 
                                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" 
                                    onClick={() => setDeleteModal({ open: false, id: null })}
                                >
                                    <motion.div 
                                        initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} 
                                        className="bg-slate-900 border border-red-500/20 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative" 
                                        onClick={e => e.stopPropagation()}
                                    >
                                         <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 mx-auto ring-1 ring-red-500/20">
                                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Delete Message?</h3>
                                        <p className="text-slate-400 text-sm mb-6">This message will be removed permanently.</p>
                                        <div className="flex gap-4">
                                            <button onClick={() => setDeleteModal({ open: false, id: null })} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/20">Delete</button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                             {replyModal.open && (
                                <motion.div 
                                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" 
                                    onClick={() => setReplyModal({...replyModal, open: false})}
                                >
                                    <motion.div 
                                        initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}}
                                        className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-2xl max-w-lg w-full relative" 
                                        onClick={e=>e.stopPropagation()}
                                    >
                                         <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                                            Reply to {replyModal.userName}
                                         </h3>
                                         <form onSubmit={handleSendReply} className="space-y-6">
                                             <div><label className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 block">Subject</label><input value={replyForm.subject} onChange={e=>setReplyForm({...replyForm, subject: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"/></div>
                                             <div>
                                                 <label className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 block">Message</label>
                                                 <textarea value={replyForm.content} onChange={e=>setReplyForm({...replyForm, content: e.target.value})} rows="6" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors resize-none"/>
                                             </div>
                                             <div className="flex gap-4">
                                                 <button type="button" onClick={()=>setReplyModal({...replyModal, open:false})} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors">Cancel</button>
                                                 <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                                                     Send Reply <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                 </button>
                                             </div>
                                         </form>
                                    </motion.div>
                                </motion.div>
                             )}
                        </AnimatePresence>

                        {/* Pending Messages */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 md:p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span className="bg-blue-500 w-2 h-2 rounded-full animate-pulse"></span>
                                New / Pending <span className="text-slate-500 text-sm font-normal">({pendingMessages.length})</span>
                            </h2>
                            <div className="grid gap-4">
                                {pendingMessages.length > 0 ? pendingMessages.map(msg => (
                                    <div key={msg.id} className="bg-slate-950/40 border border-slate-800/50 p-4 md:p-6 rounded-2xl hover:border-blue-500/30 transition-all border-l-4 border-l-blue-500">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div>
                                                <h4 className="font-bold text-white text-base md:text-lg">{msg.user_name} <span className="text-xs font-normal text-slate-500 block md:inline">({msg.user_email})</span></h4>
                                                <p className="text-sm text-slate-300 mt-2">{msg.content}</p>
                                                <span className="text-xs text-slate-600 mt-2 block">{new Date(msg.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-2 self-end md:self-start">
                                                <button onClick={()=>handleOpenReply(msg)} className="text-xs md:text-sm bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/20 hover:bg-blue-600/30 transition-colors font-medium">Reply</button>
                                                <button onClick={()=>handleDeleteMessage(msg.id)} className="text-xs md:text-sm text-red-500 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors font-medium">Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="text-center py-8 text-slate-500 italic">No pending messages. Good job!</div>}
                            </div>
                        </div>

                        {/* Replied Messages */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 md:p-6 opacity-80 hover:opacity-100 transition-opacity">
                            <h2 className="text-xl font-bold text-slate-300 mb-4 flex items-center gap-2">
                                <span className="bg-green-500 w-2 h-2 rounded-full"></span>
                                Replied History <span className="text-slate-500 text-sm font-normal">({repliedMessages.length})</span>
                            </h2>
                            <div className="grid gap-4">
                                {repliedMessages.length > 0 ? repliedMessages.map(msg => (
                                    <div key={msg.id} className="bg-slate-950/40 border border-slate-800/50 p-4 md:p-6 rounded-2xl hover:border-slate-700 transition-all">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div>
                                                <h4 className="font-bold text-slate-400 text-base md:text-lg">{msg.user_name} <span className="text-xs font-normal text-slate-500 block md:inline">({msg.user_email})</span></h4>
                                                <p className="text-sm text-slate-500 mt-2">{msg.content}</p>
                                                <span className="text-xs text-slate-600 mt-2 block">{new Date(msg.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-2 self-end md:self-start">
                                                <span className="inline-block px-3 py-1 bg-green-500/10 text-green-500 text-xs rounded-lg border border-green-500/20 font-bold uppercase tracking-wider">Replied</span>
                                                <button onClick={()=>handleDeleteMessage(msg.id)} className="text-xs md:text-sm text-slate-500 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:text-red-400 hover:bg-red-900/10 transition-colors">Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="text-center py-8 text-slate-500 italic">No replied messages yet.</div>}
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'logs' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 md:p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg md:text-xl font-bold text-white">System Logs</h2>
                            <div className="flex gap-3">
                                <button onClick={fetchData} className="text-xs md:text-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Refresh
                                </button>
                                <button onClick={()=>setClearLogsModal(true)} className="text-xs md:text-sm text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 font-mono text-xs md:text-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                             {logs.length > 0 ? logs.map((log) => (
                                <div key={log.id} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50">
                                    <span className="text-slate-500 text-[10px] md:text-xs min-w-[170px] flex-shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                                    <span className={`font-bold text-[10px] md:text-xs min-w-[50px] flex-shrink-0 ${
                                        log.level === 'INFO' ? 'text-green-400' :
                                        log.level === 'WARN' ? 'text-yellow-400' :
                                        log.level === 'ERROR' ? 'text-red-400' : 'text-blue-400'
                                    }`}>{log.level}</span>
                                    <span className="break-all">{log.message}</span>
                                </div>
                             )) : <div className="text-center py-8 text-slate-500">No logs found.</div>}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatCard = ({ title, value, icon, trend, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
        green: 'bg-green-500/10 border-green-500/20 text-green-500',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-500',
    };

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all shadow-xl group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                {trend && <span className="text-xs font-medium text-slate-400 bg-slate-950 px-2 py-1 rounded-full border border-slate-800">{trend}</span>}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</h3>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
        </div>
    );
};

export default AdminDashboard;
