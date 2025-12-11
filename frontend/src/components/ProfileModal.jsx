import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const AVATARS = [
    { id: 1, type: 'initials', color: 'from-blue-500 to-purple-600' },
    { id: 2, type: 'emoji', content: '👨‍💻', color: 'from-emerald-400 to-cyan-500' },
    { id: 3, type: 'emoji', content: '🚀', color: 'from-orange-400 to-red-500' },
    { id: 4, type: 'emoji', content: '⚡', color: 'from-yellow-400 to-orange-500' },
    { id: 5, type: 'emoji', content: '🤖', color: 'from-indigo-400 to-purple-500' },
    { id: 6, type: 'emoji', content: '😼', color: 'from-pink-400 to-rose-500' },
];

const ProfileModal = ({ user, setUser, onClose }) => {
    const [activeTab, setActiveTab] = useState('profile'); // profile | security
    const [formData, setFormData] = useState({
        full_name: user.full_name || '',
        email: user.email || '',
        avatarId: user.avatar_id || user.avatarId || 1
    });
    
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        try {
            // Note: avatarId is local for now, not in DB, but we keep it in state
            const res = await axios.put('http://localhost:8000/update_profile', {
                user_id: user.id,
                full_name: formData.full_name,
                avatar_id: formData.avatarId
            });
            setUser({ ...user, ...res.data });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // Close after success
            setTimeout(onClose, 1000);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Update failed. Check your network.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await axios.put('http://localhost:8000/change_password', {
                user_id: user.id,
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ current_password: '', new_password: '' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Password change failed.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                    <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-slate-800">
                        <button 
                            onClick={() => { setActiveTab('profile'); setMessage({ type: '', text: '' }); }}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'profile' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            General Info
                            {activeTab === 'profile' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                        </button>
                        <button 
                            onClick={() => { setActiveTab('security'); setMessage({ type: '', text: '' }); }}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'security' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Security
                            {activeTab === 'security' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                        </button>
                    </div>

                    {message.text && (
                        <div className={`mb-4 p-3 rounded-xl text-sm text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={activeTab === 'profile' ? handleProfileUpdate : handlePasswordChange}>
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Avatar Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-3">Choose Avatar</label>
                                    <div className="flex gap-3 flex-wrap">
                                        {AVATARS.map((avatar) => (
                                            <button
                                                key={avatar.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatarId: avatar.id })}
                                                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-lg border-2 transition-all ${formData.avatarId === avatar.id ? 'border-blue-500 scale-110' : 'border-transparent hover:border-slate-600'} bg-gradient-to-br ${avatar.color}`}
                                            >
                                                {avatar.type === 'initials' ? (
                                                    <span className="text-white font-bold text-sm">{formData.full_name?.charAt(0) || 'U'}</span>
                                                ) : avatar.content}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-300">Full Name</label>
                                        <input 
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                            type="text" 
                                            required
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-300">Email Address</label>
                                        <input 
                                            value={formData.email}
                                            readOnly
                                            disabled
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed" 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-300">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            value={passwordData.current_password}
                                            onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                            type={showCurrentPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            required
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all pr-10" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showCurrentPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-300">New Password</label>
                                    <div className="relative">
                                        <input 
                                            value={passwordData.new_password}
                                            onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                            type={showNewPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            required
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all pr-10" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showNewPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-8 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ProfileModal;
