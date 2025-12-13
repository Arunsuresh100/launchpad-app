import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = ({ user, setPage, setUser }) => {
    const [stats, setStats] = useState({ total_users: 0, active_users: 0, total_resumes: 0 });
    const [users, setUsers] = useState([]);
    const [deletedUsers, setDeletedUsers] = useState([]); 
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [notification, setNotification] = useState('');
    
    // Job Form State
    const [showJobForm, setShowJobForm] = useState(false);
    const [jobForm, setJobForm] = useState({
        title: '', company: '', location: '', description: '', 
        skills_required: '', contract_type: 'full_time', url: '' 
    });

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
            // Unpack 6 responses strictly
            const [statsRes, usersRes, deletedUsersRes, jobsRes, logsRes, msgsRes] = await Promise.all([
                axios.get('/admin/stats'),
                axios.get('/admin/users'),
                axios.get('/admin/users/deleted'),
                axios.get('/admin/jobs'),
                axios.get('/admin/logs'),
                axios.get('/admin/messages')
            ]);
            
            setStats(statsRes.data);
            setUsers(usersRes.data);
            
            // Sort Deleted Users: Most recent (Reverse order of API which usually sends oldest first)
            // Ideally backend should sort, but we do it here to be safe and fast
            setDeletedUsers([...deletedUsersRes.data].reverse());
            
            setJobs(jobsRes.data);
            setLogs(logsRes.data);
            setMessages(msgsRes.data);
            
        } catch (err) {
            console.error("Admin Fetch Error", err);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (msg, type='success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(''), 3000);
    };

    const handleJobSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/admin/jobs', jobForm);
            showNotification(`Job "${jobForm.title}" posted successfully.`);
            setShowJobForm(false);
            setJobForm({title: '', company: '', location: '', description: '', skills_required: '', contract_type: 'full_time', url: ''});
            fetchData(); 
        } catch (err) {
            console.error(err);
            showNotification("Failed to post job.", 'error');
        }
    };

    const handleDeleteJob = async (id, title) => {
        try {
            await axios.delete(`/admin/jobs/${id}`);
            showNotification(`Job "${title}" deleted.`);
            setJobs(jobs.filter(j => j.id !== id));
            fetchData();
        } catch (err) {
            console.error(err);
            showNotification("Failed to delete job.", 'error');
        }
    };
    
    // User Soft Delete State
    const [deleteUserModal, setDeleteUserModal] = useState({ open: false, id: null, name: '' });
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
    
    // Logs Clear
    const [clearLogsModal, setClearLogsModal] = useState(false);
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
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

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

    // Split Messages
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

            {/* Clear Logs Modal */}
             <AnimatePresence>
                {clearLogsModal && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setClearLogsModal(false)}>
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-slate-900 border border-red-500/30 p-6 rounded-2xl max-w-sm w-full" onClick={e=>e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-white mb-2">Clear All Logs?</h3>
                            <p className="text-slate-400 text-sm mb-4">This will permanently delete all system logs. This action cannot be undone.</p>
                            <div className="flex gap-2">
                                <button onClick={()=>setClearLogsModal(false)} className="flex-1 py-2 bg-slate-800 rounded-lg text-slate-300 text-sm">Cancel</button>
                                <button onClick={handleClearLogs} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold">Clear All</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 supports-backdrop-blur:bg-slate-900/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/admin-logo.png" alt="Logo" className="w-8 h-8 rounded-lg bg-slate-800" />
                        <h1 className="text-lg font-bold text-white tracking-tight hidden md:block">Admin Console</h1>
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
                    {['overview', 'jobs', 'deleted_users', 'messages', 'logs'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
                            {tab.replace('_', ' ')}
                            {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-400" />}
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

                        {/* User Delete Modal */}
                        <AnimatePresence>
                            {deleteUserModal.open && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm"
                                    onClick={() => setDeleteUserModal({open: false, id: null, name: ''})}
                                >
                                    <motion.div 
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 100, opacity: 0 }}
                                        className="bg-slate-900 border-t md:border border-red-500/30 p-6 md:p-8 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md relative overflow-hidden"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                                        <div className="md:hidden w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4"></div>
                                        
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Delete Account</h3>
                                                <p className="text-slate-400 text-sm mt-1">Delete <strong>{deleteUserModal.name}</strong>? They will be moved to archives.</p>
                                            </div>
                                        </div>

                                        <div className="mb-6 relative">
                                            <label className="block text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Reason (Required)</label>
                                            <textarea 
                                                value={deleteReason} 
                                                onChange={e => { setDeleteReason(e.target.value); setValidationMsg(''); }}
                                                className={`w-full bg-slate-950 border ${validationMsg ? 'border-red-500' : 'border-slate-700'} rounded-lg p-3 text-white text-sm focus:border-red-500 outline-none resize-none transition-colors`}
                                                rows="3"
                                                placeholder="e.g. Violation of terms..."
                                                autoFocus
                                            ></textarea>
                                            {validationMsg && <span className="text-xs text-red-500 absolute -bottom-5 left-0">{validationMsg}</span>}
                                        </div>

                                        <div className="flex gap-3 justify-end">
                                            <button onClick={() => setDeleteUserModal({open: false, id: null, name: ''})} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                                            <button onClick={handleSoftDeleteUser} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2">
                                                <span>Delete User</span>
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
                                                <td className="px-6 py-4 font-mono text-xs">{u.last_active ? new Date(u.last_active).toLocaleString() : 'Never'}</td>
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
                
                {activeTab === 'jobs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-xl md:text-2xl font-bold text-white">Job Management</h2></div>
                            <button onClick={() => setShowJobForm(!showJobForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                                {showJobForm ? 'Cancel' : '+ New Job'}
                            </button>
                        </div>

                        <AnimatePresence>
                        {showJobForm && (
                            <motion.form initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} onSubmit={handleJobSubmit} className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl space-y-4 overflow-hidden">
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
                                <input value={jobForm.skills_required} onChange={e=>setJobForm({...jobForm, skills_required: e.target.value})} placeholder="Skills (comma separated)" className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                <input value={jobForm.url} onChange={e=>setJobForm({...jobForm, url: e.target.value})} placeholder="Application URL (Required) *" required className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white w-full"/>
                                <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg">Publish Job</button>
                            </motion.form>
                        )}
                        </AnimatePresence>
                        
                        <div className="grid grid-cols-1 gap-4">
                             {jobs.map((job) => (
                                <div key={job.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4 group hover:border-slate-700 transition-all">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{job.title} <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ml-2 ${job.contract_type === 'internship' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>{job.contract_type === 'internship' ? 'Intern' : 'Full Time'}</span></h3>
                                        <p className="text-sm text-slate-400">{job.company} • {job.location}</p>
                                        <p className="text-xs text-slate-500 mt-1">Posted: {new Date(job.date_posted).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleDeleteJob(job.id, job.title)} className="w-full md:w-auto p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium">
                                        Delete
                                    </button>
                                </div>
                             ))}
                             {jobs.length === 0 && <p className="text-slate-500 text-center py-8">No jobs posted yet.</p>}
                        </div>
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
                                            <td className="px-6 py-4 font-mono text-xs">{u.last_active ? new Date(u.last_active).toLocaleString() : 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => handleRestoreUser(u.id)} className="px-3 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20 text-xs font-bold uppercase">Restore</button>
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
                                             <button onClick={() => handleRestoreUser(u.id)} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 text-xs font-bold uppercase">Restore</button>
                                        </div>
                                        <div className="text-xs text-slate-500 bg-slate-900 p-2 rounded border border-slate-800 mb-2">
                                            <span className="text-slate-400 font-bold">Reason:</span> {u.deletion_reason || 'No reason'}
                                        </div>
                                        <p className="text-[10px] text-slate-600 text-right">Last Active: {u.last_active ? new Date(u.last_active).toLocaleString() : 'N/A'}</p>
                                    </div>
                                )) : <div className="text-center p-6 text-slate-500">No deleted users.</div>}
                         </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="space-y-8 min-h-[600px] relative">
                        {/* Modals are shared */}
                         <AnimatePresence>
                            {deleteModal.open && (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, id: null })}>
                                    <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-slate-900 border border-red-500/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                                        <h3 className="text-xl font-bold text-white mb-2">Delete Message?</h3>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => setDeleteModal({ open: false, id: null })} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancel</button>
                                            <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                             {replyModal.open && (
                                <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setReplyModal({...replyModal, open: false})}>
                                    <motion.div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-lg w-full" onClick={e=>e.stopPropagation()}>
                                         <h3 className="text-lg font-bold text-white mb-4">Reply to {replyModal.userName}</h3>
                                         <form onSubmit={handleSendReply} className="space-y-4">
                                             <div><label className="text-slate-400 text-xs font-bold uppercase">Subject</label><input value={replyForm.subject} onChange={e=>setReplyForm({...replyForm, subject: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-1"/></div>
                                             <div><label className="text-slate-400 text-xs font-bold uppercase">Message</label><textarea value={replyForm.content} onChange={e=>setReplyForm({...replyForm, content: e.target.value})} rows="6" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-1"/></div>
                                             <div className="flex gap-3"><button type="button" onClick={()=>setReplyModal({...replyModal, open:false})} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Send Reply</button></div>
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
                                                <button onClick={()=>handleOpenReply(msg)} className="text-xs md:text-sm bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-600/30 transition-colors">Reply</button>
                                                <button onClick={()=>handleDeleteMessage(msg.id)} className="text-xs md:text-sm text-red-500 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">Delete</button>
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
                                                <span className="inline-block px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded border border-green-500/20 font-bold uppercase tracking-wider">Replied</span>
                                                <button onClick={()=>handleDeleteMessage(msg.id)} className="text-xs md:text-sm text-slate-500 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:text-red-400 hover:bg-red-900/10 transition-colors">Delete</button>
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
                            <button onClick={()=>setClearLogsModal(true)} className="text-xs md:text-sm text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                                Clear All
                            </button>
                        </div>
                        <div className="space-y-2 font-mono text-xs md:text-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                             {logs.length > 0 ? logs.map((log) => (
                                <div key={log.id} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50">
                                    <span className="text-slate-500 text-[10px] md:text-xs min-w-[150px]">{new Date(log.timestamp).toLocaleString()}</span>
                                    <span className={`font-bold text-[10px] md:text-xs min-w-[50px] ${
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
