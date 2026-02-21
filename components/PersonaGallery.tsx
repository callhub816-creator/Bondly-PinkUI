
import React from 'react';
import { Persona } from '../types';
import PersonaCard from './PersonaCard';

interface PersonaGalleryProps {
  personas: Persona[];
  onStartCall: (persona: Persona) => void;
  onStartChat: (persona: Persona, avatarUrl?: string) => void;
  onViewProfile: (persona: Persona, avatarUrl?: string) => void;
  onOpenShop?: () => void;
}

const PersonaGallery: React.FC<PersonaGalleryProps> = ({ personas, onStartCall, onStartChat, onViewProfile, onOpenShop }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-3 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            onStartCall={onStartCall}
            onStartChat={onStartChat}
            onViewProfile={onViewProfile}
            onOpenShop={onOpenShop}
          />
        ))}
      </div>
    </div>
  );
};

export default PersonaGallery;