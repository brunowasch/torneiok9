'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getRooms, getTestTemplates } from '@/services/adminService';
import { Room, TestTemplate, Modality, MODALITIES } from '@/types/schema';
import { Trophy, Medal, Crown, ListFilter, Target, Flame } from 'lucide-react';
import { LeaderboardEntry, subscribeToLeaderboard } from '@/services/rankingService';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tests, setTests] = useState<TestTemplate[]>([]);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | 'geral'>('geral');
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

  useEffect(() => {
    if (!selectedRoomId) return;

    // Fetch tests for this room
    getTestTemplates(selectedRoomId).then(t => setTests(t));

    const unsubscribe = subscribeToLeaderboard(selectedRoomId, (data) => {
      setLeaderboard(data);
    });

    return () => unsubscribe();
  }, [selectedRoomId]);

  // Set default modality
  useEffect(() => {
    if (!selectedModality && MODALITIES.length > 0) {
      setSelectedModality(MODALITIES[0]);
    }
  }, []);

  // Compute filtered leaderboard based on Modality & Test
  const getFilteredLeaderboard = () => {
    if (!selectedModality) return [];

    // Filter tests belonging to this modality
    const modalityTests = tests.filter(t => t.modality === selectedModality);
    const modalityTestIds = modalityTests.map(t => t.id);

    return leaderboard
      .map(entry => {
        let score = 0;
        let count = 0;

        if (selectedTestId === 'geral') {
          // Sum scores from all tests in this modality
          modalityTestIds.forEach(tId => {
            if (entry.scoresByTest[tId]) {
              score += entry.scoresByTest[tId];
              count++;
            }
          });
        } else {
          // Specific test score
          if (entry.scoresByTest[selectedTestId]) {
            score = entry.scoresByTest[selectedTestId];
            count = entry.scoresByTest[selectedTestId] !== undefined ? 1 : 0;
          }
        }

        return { ...entry, currentScore: score, currentCount: count };
      })
      .filter(e => e.currentScore > 0 || e.currentCount > 0) // Only show those who participated? Or show all with 0? Let's show all but sort.
      .sort((a, b) => b.currentScore - a.currentScore);
  };

  const filteredData = getFilteredLeaderboard();
  const modalityTests = tests.filter(t => t.modality === selectedModality);

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
              Classificação Tática
            </h1>
            <p className="text-gray-500 text-sm uppercase tracking-widest pl-14">Tempo Real • Atualização Automática</p>
          </div>

          <div className="w-full md:w-auto flex gap-4">
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full md:w-64 bg-black/50 border border-gray-700 text-white p-3 rounded focus:border-police-gold focus:outline-none uppercase font-bold text-sm tracking-wide"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
              {rooms.length === 0 && <option>NENHUMA SALA ATIVA</option>}
            </select>
          </div>
        </div>

        {/* Modality Tabs */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {MODALITIES.map(mod => (
              <button
                key={mod}
                onClick={() => { setSelectedModality(mod); setSelectedTestId('geral'); }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-transparent transition-all whitespace-nowrap ${selectedModality === mod
                  ? 'bg-police-gold text-black border-police-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : 'bg-black/40 text-gray-500 border-gray-800 hover:border-gray-500 hover:text-white'
                  }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Test Selector (Sub-nav) */}
        {selectedModality && (
          <div className="mb-6 flex flex-wrap items-center gap-2 bg-tactical-gray p-2 rounded-lg border border-gray-800">
            <button
              onClick={() => setSelectedTestId('geral')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded flex items-center gap-2 transition-colors ${selectedTestId === 'geral' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <Trophy className="w-3 h-3" /> Campeão da Modalidade
            </button>
            <div className="w-px h-6 bg-gray-700 mx-2"></div>
            {modalityTests.length === 0 && <span className="text-xs text-gray-600 px-2">NENHUMA PROVA CADASTRADA NESTA MODALIDADE</span>}
            {modalityTests.map(test => (
              <button
                key={test.id}
                onClick={() => setSelectedTestId(test.id)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded flex items-center gap-2 transition-colors ${selectedTestId === test.id ? 'bg-police-gold/20 text-police-gold border border-police-gold/50' : 'text-gray-500 hover:text-white'}`}
              >
                <Target className="w-3 h-3" /> {test.title}
              </button>
            ))}
          </div>
        )}


        {/* Leaderboard Table */}
        <div className="bg-tactical-gray border border-gray-800 rounded-xl shadow-2xl overflow-hidden relative min-h-[400px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-police-gold via-white to-police-gold opacity-50"></div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/40 text-police-gold uppercase text-[0.65rem] tracking-[0.2em] font-black">
                <tr>
                  <th className="p-4 text-center w-20">Pos</th>
                  <th className="p-4">Competidor (Binômio)</th>
                  <th className="p-4">Raça</th>
                  <th className="p-4 text-center">Provas Realizadas</th>
                  <th className="p-4 text-right">Pontuação {selectedTestId === 'geral' ? 'Total' : 'Prova'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 font-mono animate-pulse">CARREGANDO DADOS TÁTICOS...</td>
                  </tr>
                )}

                {!loading && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 font-mono">
                      <div className="flex flex-col items-center gap-2">
                        <ListFilter className="w-8 h-8 opacity-20" />
                        <span>[SEM DADOS REGISTRADOS PARA ESTA SELEÇÃO]</span>
                      </div>
                    </td>
                  </tr>
                )}

                {filteredData.map((entry, index) => (
                  <tr key={entry.id} className={`hover:bg-white/5 transition-colors ${index < 3 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="p-4 text-center">
                      <div className={`font-black text-xl md:text-2xl ${getMedalColor(index)} flex justify-center items-center`}>
                        {index < 3 ? (
                          index === 0 ? <Crown className="w-6 h-6 md:w-8 md:h-8" /> : <Medal className="w-6 h-6 md:w-8 md:h-8" />
                        ) : (
                          <span className="text-gray-600 text-base md:text-lg">#{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar Placeholder */}
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                          {entry.handlerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-wide text-sm md:text-base">{entry.handlerName}</div>
                          <div className="text-[10px] md:text-xs text-police-gold uppercase font-mono flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Cão: {entry.dogName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs md:text-sm text-gray-400 uppercase tracking-wide font-mono hidden md:table-cell">
                      {entry.dogBreed}
                    </td>
                    <td className="p-4 text-center text-xs md:text-sm font-bold text-gray-500">
                      {selectedTestId === 'geral' ? entry.currentCount : (entry.currentCount > 0 ? 'Concluída' : '-')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xl md:text-3xl font-black text-white tracking-tighter leading-none">
                          {entry.currentScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Pontos</span>
                      </div>
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
