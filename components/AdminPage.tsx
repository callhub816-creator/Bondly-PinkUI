
import React, { useState, useEffect, useRef } from 'react';
import { Persona } from '../types';
import { ArrowLeft, Upload, Save, RefreshCw, Image as ImageIcon, Check, Crop, X, Smartphone, Monitor } from 'lucide-react';

interface AdminPageProps {
  personas: Persona[];
  onUpdatePersonaImage: (id: string | number, imageUrl: string | undefined) => void;
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ personas, onUpdatePersonaImage, onBack }) => {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileSelect = (persona: Persona, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result as string);
        setEditingPersona(persona);
        setCropMode(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCrop = () => {
    if (!editingPersona || !selectedFile) return;
    onUpdatePersonaImage(editingPersona.id, selectedFile);
    setEditingPersona(null);
    setSelectedFile(null);
    setCropMode(false);
  };

  const handleResetImage = (id: string | number) => {
    onUpdatePersonaImage(id, undefined);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans text-[#5e3a58]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Content Manager</h1>
            <p className="text-xs text-gray-500">Upload, crop, and map official profile photos</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md border border-blue-200 flex items-center gap-2">
            <Monitor size={14} /> Admin Console
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {personas.map((persona) => {
            const isMapped = !!persona.avatarUrl;
            return (
              <div key={persona.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">

                <div className={`h-1.5 w-full ${isMapped ? 'bg-green-500' : 'bg-gray-200'}`} />

                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{persona.name}</h3>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      Default Style
                    </span>
                  </div>
                  {isMapped ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-100">
                      <Check size={12} /> LIVE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                      AI AUTO
                    </div>
                  )}
                </div>

                <div className="relative w-full aspect-[3/4] bg-gray-50 overflow-hidden">
                  {persona.avatarUrl ? (
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 m-4 rounded-lg">
                      <ImageIcon size={32} className="mb-2 opacity-30" />
                      <span className="text-xs font-medium">No Image</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                    <label className="cursor-pointer w-full py-2.5 bg-white hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105">
                      <Upload size={16} />
                      {isMapped ? 'Replace Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(persona, e)}
                      />
                    </label>

                    {isMapped && (
                      <button
                        onClick={() => handleResetImage(persona.id)}
                        className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <RefreshCw size={16} /> Unlink / Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CROP / PREVIEW MODAL */}
      {cropMode && editingPersona && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl">
            <div className="flex-1 bg-gray-100 relative flex items-center justify-center p-8 border-r border-gray-200">
              <img
                src={selectedFile}
                alt="Source"
                className="max-w-full max-h-full object-contain shadow-lg rounded-md"
              />
            </div>
            <div className="w-[350px] bg-white flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Preview</h3>
                <button onClick={() => setCropMode(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 border-t border-gray-100 bg-white space-y-3 mt-auto">
                <button
                  onClick={handleSaveCrop}
                  className="w-full py-3 rounded-xl bg-[#B28DFF] hover:bg-[#9F7AEA] text-white font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save & Map Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
