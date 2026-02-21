import { useEffect, useState } from "react";
import {
  getAllUserPersonas,
  pruneOldPersonas,
  deleteUserPersona,
} from "../utils/storage";
import PersonaCard from "../../components/PersonaCard";

export default function MyCreations() {
  const [list, setList] = useState(getAllUserPersonas());

  useEffect(() => {
    pruneOldPersonas(7);
    setList(getAllUserPersonas());
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <div className="text-center mb-8">
        <span className="text-sm text-pink-500 uppercase">My Creations</span>
        <h1 className="text-4xl font-serif">Your Created Companions</h1>
        <p className="text-gray-400 text-xs">Private • Stored Locally • 7-Day Retention</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {list.map((p) => (
          <div className="relative" key={p.id}>
            <PersonaCard
              persona={p as any}
              onStartCall={() => { }}
              onStartChat={() => { }}
              onViewProfile={() => { }}
            />

            <button
              onClick={() => {
                deleteUserPersona(p.id);
                setList(getAllUserPersonas());
              }}
              className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs shadow"
            >
              Delete
            </button>

            <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-full text-xs text-white">
              {Math.ceil((p.createdAt + 7 * 24 * 3600 * 1000 - Date.now()) / (24 * 3600 * 1000))} d left
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
