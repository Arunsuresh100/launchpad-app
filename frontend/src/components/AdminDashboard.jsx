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
            setDeletedUsers(deletedUsersRes.data); // Fixed variable name
            setJobs(jobsRes.data);
            setLogs(logsRes.data);
            setMessages(msgsRes.data);
        } catch (err) {
            console.error("Admin Fetch Error", err);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (msg) => {
        setNotification(msg);
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
            showNotification("Failed to post job.");
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
            showNotification("Failed to delete job.");
        }
    };
    
    // User Soft Delete State
    const [deleteUserModal, setDeleteUserModal] = useState({ open: false, id: null, name: '' });
    const [deleteReason, setDeleteReason] = useState('');

    const handleSoftDeleteUser = async () => {
        if (!deleteReason.trim()) {
            alert("Please provide a reason for deletion.");
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
            showNotification("Failed to delete user.");
        }
    };

    const handleRestoreUser = async (id) => {
        try {
            await axios.post(`/admin/users/${id}/restore`);
            showNotification(`User restored.`);
            fetchData();
        } catch (err) {
             console.error(err);
             showNotification("Failed to restore user.");
        }
    };
    
    // Logs Clear
    const handleClearLogs = async () => {
        // Custom confirmation, or we can build a modal. For logs standard confirm is ok, but user asked for professional.
        if(!confirm("Are you sure you want to clear ALL system logs? This cannot be undone.")) return;
        try {
            await axios.delete('/admin/logs');
            showNotification("Logs cleared.");
            fetchData();
        } catch (err) {
            console.error(err);
            showNotification("Failed to clear logs.");
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
            showNotification("Failed to delete message.");
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
                 showNotification("Opening Gmail...");
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
            if (confirm("Email sending failed. Open Gmail to reply?")) {
                 const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(replyModal.userEmail)}&su=${encodeURIComponent(replyForm.subject)}&body=${encodeURIComponent(replyForm.content)}`;
                 window.open(gmailUrl, '_blank');
            }
        }
    };
    
    // Filter users
    const filteredUsers = users.filter(u => 
        u.role !== 'admin' && 
        (u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 relative">
             <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 right-8 bg-slate-800 border border-slate-700 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3"
                    >
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="font-medium">{notification}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <img src="/admin-logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-slate-700 shadow-lg shadow-blue-500/20 flex-shrink-0" />
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Admin Console</h1>
                            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Restricted Access</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-xs font-medium text-slate-300">System Online</span>
                        </div>
                        <button 
                            onClick={() => {
                                localStorage.removeItem('user'); 
                                setUser(null); 
                                setPage('home');
                            }}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-fade-in-up">
                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-800 pb-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'overview' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>Overview{activeTab === 'overview' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-400" />}</button>
                    <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'jobs' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>Job Management{activeTab === 'jobs' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-400" />}</button>
                    <button onClick={() => setActiveTab('deleted_users')} className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'deleted_users' ? 'text-red-400' : 'text-slate-400 hover:text-white'}`}>Deleted Users{activeTab === 'deleted_users' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-red-400" />}</button>
                    <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'messages' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>Messages{activeTab === 'messages' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-400" />}</button>
                    <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'logs' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>System Logs{activeTab === 'logs' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-400" />}</button>
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Total Users" value={stats.total_users} icon={<svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} trend="+12% this week" color="blue" />
                            <StatCard title="Active Now" value={stats.active_users} icon={<svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>} trend="Live Status" color="green" />
                            <StatCard title="Active Jobs" value={jobs.length} icon={<svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} trend="Posted by Admin" color="purple" />
                        </div>

                        {/* User Delete Modal (Professional) */}
                        <AnimatePresence>
                            {deleteUserModal.open && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                                    onClick={() => setDeleteUserModal({open: false, id: null, name: ''})}
                                >
                                    <motion.div 
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.95, opacity: 0 }}
                                        className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                                        
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Delete Account</h3>
                                                <p className="text-slate-400 text-sm mt-1">You are about to delete <strong>{deleteUserModal.name}</strong>. This will move them to the Deleted Users archive.</p>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Reason for Deletion <span className="text-red-500">*</span></label>
                                            <textarea 
                                                value={deleteReason} 
                                                onChange={e => setDeleteReason(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-red-500 outline-none resize-none transition-colors"
                                                rows="3"
                                                placeholder="e.g. Violation of terms, Requested by user..."
                                                autoFocus
                                            ></textarea>
                                        </div>

                                        <div className="flex gap-3 justify-end">
                                            <button onClick={() => setDeleteUserModal({open: false, id: null, name: ''})} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                                            <button onClick={handleSoftDeleteUser} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
                                                <span>Delete User</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* User Table */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/30">
                                <h2 className="text-xl font-bold text-white">User Management</h2>
                                <div className="relative group w-full md:w-auto">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <input 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        type="text" 
                                        placeholder="Search users..." 
                                        className="block w-full md:w-72 pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-950 text-slate-300 placeholder-slate-600 focus:outline-none focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
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
                                                    <button onClick={() => setDeleteUserModal({ open: true, id: u.id, name: u.full_name })} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group" title="Delete User">
                                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No users found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
                
                {activeTab === 'jobs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-2xl font-bold text-white">Job Management</h2><p className="text-slate-400 text-sm">Add and manage listings.</p></div>
                            <button onClick={() => setShowJobForm(!showJobForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                                {showJobForm ? 'Cancel' : 'Post New Job'}
                            </button>
                        </div>

                        <AnimatePresence>
                        {showJobForm && (
                            <motion.form initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} onSubmit={handleJobSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 overflow-hidden">
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
                                <div key={job.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex justify-between items-center group hover:border-slate-700 transition-all">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{job.title} <span className={`text-xs px-2 py-0.5 rounded border ml-2 ${job.contract_type === 'internship' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>{job.contract_type === 'internship' ? 'Intern' : 'Full Time'}</span></h3>
                                        <p className="text-sm text-slate-400">{job.company} • {job.location}</p>
                                        <p className="text-xs text-slate-500 mt-1">Posted: {new Date(job.date_posted).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleDeleteJob(job.id, job.title)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
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
                         <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Deleted Users Archive</h2>
                            <span className="text-slate-500 text-sm">{deletedUsers.length} archived</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider">
                                    <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Reason</th><th className="px-6 py-4">Deleted/Last Active</th><th className="px-6 py-4">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {deletedUsers.length > 0 ? deletedUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div><p className="font-medium text-slate-300">{u.full_name}</p><p className="text-xs text-slate-600">{u.email}</p></div>
                                            </td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-red-900/20 text-red-400 border border-red-900/40 text-xs font-bold uppercase">Deleted</span></td>
                                            <td className="px-6 py-4 text-slate-300 italic">"{u.deletion_reason || 'No reason'}"</td>
                                            <td className="px-6 py-4 font-mono text-xs">{u.last_active ? new Date(u.last_active).toLocaleString() : 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => handleRestoreUser(u.id)} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider">
                                                    Restore
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                                No deleted users found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 min-h-[600px] relative">
                        {/* Messages Tab Content... (Keeping existing logic but ensuring data flows) */}
                         
                        <AnimatePresence>
                            {deleteModal.open && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                                    onClick={() => setDeleteModal({ open: false, id: null })}
                                >
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl max-w-sm w-full relative text-center"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Delete Message?</h3>
                                        <p className="text-slate-400 text-sm mb-6">This action cannot be undone.</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => setDeleteModal({ open: false, id: null })} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                                            <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors">Confirm Delete</button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Reply Modal */}
                        <AnimatePresence>
                             {replyModal.open && (
                                <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setReplyModal({...replyModal, open: false})}>
                                    <motion.div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-lg w-full relative" onClick={e=>e.stopPropagation()}>
                                         <h3 className="text-xl font-bold text-white mb-4">Reply to {replyModal.userName}</h3>
                                         <form onSubmit={handleSendReply} className="space-y-4">
                                             <div><label className="text-slate-400 text-xs font-bold uppercase">Subject</label><input value={replyForm.subject} onChange={e=>setReplyForm({...replyForm, subject: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-1"/></div>
                                             <div><label className="text-slate-400 text-xs font-bold uppercase">Message</label><textarea value={replyForm.content} onChange={e=>setReplyForm({...replyForm, content: e.target.value})} rows="6" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-1"/></div>
                                             <div className="flex gap-3"><button type="button" onClick={()=>setReplyModal({...replyModal, open:false})} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Send</button></div>
                                         </form>
                                    </motion.div>
                                </motion.div>
                             )}
                        </AnimatePresence>

                        {/* Messages List ... */}
                         <div className="flex justify-between items-center mb-8">
                            <div><h2 className="text-2xl font-bold text-white">Inbox</h2><p className="text-slate-400 text-sm">Manage user inquiries.</p></div>
                        </div>
                        {messages.length === 0 ? (
                             <div className="text-center py-12 text-slate-500">No messages found.</div>
                        ) : (
                             <div className="grid gap-4">
                                {messages.map(msg => (
                                     <div key={msg.id} className="bg-slate-950/40 border border-slate-800/50 p-6 rounded-2xl hover:border-blue-500/30 transition-all">
                                         <div className="flex justify-between items-start">
                                             <div>
                                                 <h4 className="font-bold text-white text-lg">{msg.user_name} <span className="text-xs font-normal text-slate-500">({msg.user_email})</span></h4>
                                                 <p className="text-sm text-slate-300 mt-2">{msg.content}</p>
                                                 <span className="text-xs text-slate-600 mt-2 block">{new Date(msg.timestamp).toLocaleString()}</span>
                                             </div>
                                             <div className="flex gap-2">
                                                 {!msg.is_replied && <button onClick={()=>handleOpenReply(msg)} className="text-sm bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg">Reply</button>}
                                                 <button onClick={()=>handleDeleteMessage(msg.id)} className="text-sm text-red-500 px-3 py-1">Delete</button>
                                             </div>
                                         </div>
                                         {msg.is_replied && <span className="inline-block mt-2 px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded border border-green-500/20">Replied</span>}
                                     </div>
                                ))}
                             </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'logs' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">System Logs</h2>
                            <div className="flex gap-4">
                                <button onClick={handleClearLogs} className="text-sm text-red-500 hover:text-red-400 font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Clear All Logs
                                </button>
                                <button onClick={fetchData} className="text-sm text-blue-400 hover:text-blue-300">Refresh</button>
                            </div>
                        </div>
                        <div className="space-y-4 font-mono text-sm max-h-[600px] overflow-y-auto overflow-x-auto pr-2 custom-scrollbar">
                             {logs.length > 0 ? logs.map((log) => (
                                <div key={log.id} className="flex gap-4 text-slate-300 hover:bg-slate-800/30 p-1 rounded transition-colors border-b border-slate-800/50 pb-2">
                                    <span className="w-36 text-slate-500 text-xs mt-0.5 flex-shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                                    <span className={`w-20 font-bold text-xs mt-0.5 flex-shrink-0 ${
                                        log.level === 'INFO' ? 'text-green-400' :
                                        log.level === 'WARN' ? 'text-yellow-400' :
                                        log.level === 'ERROR' ? 'text-red-400' : 'text-blue-400'
                                    }`}>{log.level}</span>
                                    <span className="text-sm break-all">{log.message}</span>
                                </div>
                             )) : (
                                 <div className="text-center py-8 text-slate-500">No logs found.</div>
                             )}
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
            <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
        </div>
    );
};

// End of component
export default AdminDashboard;
