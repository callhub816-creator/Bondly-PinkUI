import { useEffect, useState } from "react";
import {
  getAllUserPersonas,
  pruneOldPersonas,
  deleteUserPersona,
} from "../utils/storage";
import PersonaCard from "../../components/PersonaCard";
import { Persona } from "../../types";

interface MyCompanionsProps {
  onStartChat?: (persona: Persona, avatarUrl?: string) => void;
  onStartCall?: (persona: Persona) => void;
  onViewProfile?: (persona: Persona, avatarUrl?: string) => void;
}

export default function MyCompanions({
  onStartChat = () => { },
  onStartCall = () => { },
  onViewProfile = () => { },
}: MyCompanionsProps) {
  const [list, setList] = useState(getAllUserPersonas());

  useEffect(() => {
    pruneOldPersonas(7);
    setList(getAllUserPersonas());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Delete this companion and all chat history? This cannot be undone.")) {
      deleteUserPersona(id);
      setList(getAllUserPersonas());
    }
  };

  const getDaysLeft = (createdAt: number): number => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expirationTime = createdAt + sevenDaysMs;
    const daysRemaining = Math.ceil((expirationTime - now) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysRemaining);
  };

  return (
    <section className="w-full bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif-display text-gray-900 mb-3 uppercase">
            MY COMPANIONS
          </h2>
          <p className="text-gray-600 text-lg">
            Your Companions • Private • Stored Locally • 7-Day Retention
          </p>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">
              You haven't created any companions yet. <br />Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map((p) => (
              <div key={p.id} className="relative">
                <PersonaCard
                  persona={p as any}
                  isUserCreated={true}
                  daysLeft={getDaysLeft(p.createdAt)}
                  onStartChat={(persona) => onStartChat(persona, p.avatarUrl)}
                  onStartCall={onStartCall}
                  onViewProfile={(persona) => onViewProfile(persona, p.avatarUrl)}
                />

                {/* Delete button - positioned absolutely over card */}
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
                  aria-label="Delete companion"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
