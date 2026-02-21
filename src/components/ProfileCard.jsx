import React from 'react';
import { User, Clock, LogOut } from 'lucide-react';

export default function ProfileCard({ guestId, userName, connectedAt, onLogout }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full bg-gradient-to-b from-rose-50 to-pink-50 border-r border-pink-200 p-6 flex flex-col">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 mb-6">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center shadow-md">
            <User size={40} className="text-white" />
          </div>
        </div>

        {/* Name */}
        <h2 className="text-center text-lg font-bold text-gray-900 mb-2">
          {userName || `Guest ${guestId?.slice(0, 5)}` || 'Anonymous'}
        </h2>

        {/* Guest ID */}
        <p className="text-center text-xs text-gray-500 font-mono bg-gray-50 py-2 px-3 rounded-lg mb-4 break-all">
          {guestId}
        </p>

        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 px-3 rounded-lg text-sm font-medium mb-4">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Online
        </div>

        {/* Connected Time */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} className="text-pink-500" />
            <span className="text-xs">
              {formatDate(connectedAt)} {formatTime(connectedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 mb-6 flex-1">
        <h3 className="text-sm font-bold text-gray-900 mb-3">💡 About</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          You're chatting anonymously! Your identity is protected. Messages are temporary and tagged with keywords automatically.
        </p>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">✨ Features</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-pink-500 font-bold mt-1">•</span>
            <span>Unlimited messages</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-pink-500 font-bold mt-1">•</span>
            <span>Automatic keyword tagging</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-pink-500 font-bold mt-1">•</span>
            <span>Real-time messaging</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-pink-500 font-bold mt-1">•</span>
            <span>No sign-up required</span>
          </li>
        </ul>
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <LogOut size={18} />
        Exit Chat
      </button>
    </div>
  );
}
