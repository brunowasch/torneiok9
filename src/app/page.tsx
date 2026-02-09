'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { subscribeToLeaderboard, LeaderboardEntry } from '@/services/rankingService';
import { getRooms } from '@/services/adminService';
import { Room } from '@/types/schema';
import { Trophy, Medal, Crown } from 'lucide-react';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch available rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const roomSnap = await getDocs(collection(db, 'rooms'));
        const roomsData = roomSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));

        setRooms(roomsData);
        if (roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }
      } catch (e) {
        console.error("Error fetching rooms", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // 2. Subscribe to leaderboard when room changes
  useEffect(() => {
    if (!selectedRoomId) return;

    const unsubscribe = subscribeToLeaderboard(selectedRoomId, (data) => {
      setLeaderboard(data);
    });

    return () => unsubscribe();
  }, [selectedRoomId]);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-yellow-400"; // Gold
      case 1: return "text-gray-400";   // Silver
      case 2: return "text-amber-700";  // Bronze
      default: return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-tactical-black text-gray-200 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Crown className="w-10 h-10 text-police-gold" />
              Classificação Geral
            </h1>
            <p className="text-gray-500 text-sm uppercase tracking-widest pl-14">Tempo Real • Atualização Automática</p>
          </div>

          {/* Room Selector */}
          <div className="w-full md:w-auto">
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:border-police-gold focus:outline-none uppercase font-bold text-sm tracking-wide"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
              {rooms.length === 0 && <option>NENHUMA SALA ATIVA</option>}
            </select>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-tactical-gray border border-gray-800 rounded-xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-police-gold via-white to-police-gold opacity-50"></div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/40 text-police-gold uppercase text-[0.65rem] tracking-[0.2em] font-black">
                <tr>
                  <th className="p-4 text-center w-20">Pos</th>
                  <th className="p-4">Competidor (Binômio)</th>
                  <th className="p-4">Raça</th>
                  <th className="p-4 text-center">Provas</th>
                  <th className="p-4 text-right">Pontuação Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-mono animate-pulse">CARREGANDO DADOS TÁTICOS...</td>
                  </tr>
                )}

                {!loading && leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-mono">
                      [SEM REGISTROS DE COMPETIDORES PARA ESTA SALA]
                    </td>
                  </tr>
                )}

                {leaderboard.map((entry, index) => (
                  <tr key={entry.id} className={`hover:bg-white/5 transition-colors ${index < 3 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="p-4 text-center">
                      <div className={`font-black text-2xl ${getMedalColor(index)} flex justify-center`}>
                        {index < 3 ? <Medal className="w-8 h-8" /> : <span className="text-gray-600 text-lg">#{index + 1}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar Placeholder */}
                        <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                          {entry.handlerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-wide">{entry.handlerName}</div>
                          <div className="text-xs text-police-gold uppercase font-mono">Cão: {entry.dogName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-400 uppercase tracking-wide font-mono">
                      {entry.dogBreed}
                    </td>
                    <td className="p-4 text-center text-sm font-bold text-gray-500">
                      {entry.evaluationsCount}
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-2xl font-black text-white tracking-tighter">
                        {entry.totalScore.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-600 block uppercase">Pontos</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
