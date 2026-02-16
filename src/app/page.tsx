'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RoomSelect from '@/components/RoomSelect';
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

  // Subscribe to rooms (real-time)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        const { collection, query, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'rooms'));

        unsubscribe = onSnapshot(
          q,
          (snap) => {
            const roomsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
            setRooms(roomsData);

            // set default/repair selectedRoomId when needed
            setSelectedRoomId(prev => {
              if ((!prev || prev === '') && roomsData.length > 0) return roomsData[0].id;
              if (prev && !roomsData.find(r => r.id === prev) && roomsData.length > 0) return roomsData[0].id;
              return prev;
            });

            setLoading(false);
          },
          (err) => {
            console.error('Error listening rooms', err);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error('Error setting up rooms listener', e);
        setLoading(false);
      }
    };

    setup();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Fetch tests and subscribe to leaderboard when room changes
  useEffect(() => {
    if (!selectedRoomId) {
      setTests([]);
      setLeaderboard([]);
      return;
    }

    // subscribe to tests for the selected room (real-time)
    let unsubscribeTests: (() => void) | undefined;
    const setupTestsListener = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'tests'), where('roomId', '==', selectedRoomId));

        unsubscribeTests = onSnapshot(q, (snap) => {
          const t = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestTemplate));
          setTests(t);
        }, (err) => console.error('Error listening tests', err));
      } catch (e) {
        console.error('Error setting up tests listener', e);
      }
    };

    setupTestsListener();

    const unsubscribeLeaderboard = subscribeToLeaderboard(selectedRoomId, (data) => {
      setLeaderboard(data);
    });

    return () => {
      if (unsubscribeTests) unsubscribeTests();
      if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    };
  }, [selectedRoomId]);

  // Set default modality
  useEffect(() => {
    if (!selectedModality && MODALITIES.length > 0) {
      setSelectedModality(MODALITIES[0]);
    }
  }, [selectedModality]);

  // Compute filtered leaderboard based on Modality & Test
  const getFilteredLeaderboard = () => {
    if (!selectedModality) return [];

    const modalityTests = tests.filter(t => t.modality === selectedModality);
    const modalityTestIds = modalityTests.map(t => t.id);

    return leaderboard
      .map(entry => {
        let score = 0;
        let count = 0;

        if (selectedTestId === 'geral') {
          modalityTestIds.forEach(tId => {
            if (entry.scoresByTest[tId]) {
              score += entry.scoresByTest[tId];
              count++;
            }
          });
        } else {
          if (entry.scoresByTest[selectedTestId]) {
            score = entry.scoresByTest[selectedTestId];
            count = entry.scoresByTest[selectedTestId] !== undefined ? 1 : 0;
          }
        }

        return { ...entry, currentScore: score, currentCount: count };
      })
      .filter(e => e.currentScore > 0 || e.currentCount > 0)
      .sort((a, b) => b.currentScore - a.currentScore);
  };

  const filteredData = getFilteredLeaderboard();
  const modalityTests = tests.filter(t => t.modality === selectedModality);

  return (
    <div className="min-h-screen bg-white text-k9-black font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3 justify-center md:justify-start">
              <Crown className="w-12 h-12 text-k9-orange" />
              Classificação
            </h1>
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest pl-0 md:pl-16 mt-1">Tempo Real • Torneio K9</p>
          </div>

          <div className="w-full md:w-auto">
            <RoomSelect
              value={selectedRoomId}
              onChange={setSelectedRoomId}
              rooms={rooms}
            />
          </div>
        </div>

        {/* Modality Tabs */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max px-3">
            {MODALITIES.map(mod => (
              <button
                key={mod}
                onClick={() => { setSelectedModality(mod); setSelectedTestId('geral'); }}
                className={`px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 
                origin-left transition-all duration-200 whitespace-nowrap shadow-sm
                ${selectedModality === mod
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105'
                  : 'bg-white text-black border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Test Selector (Sub-nav) */}
        {selectedModality && (
          <div className="mb-8 flex flex-wrap items-center gap-6 p-2">
            <button
              onClick={() => setSelectedTestId('geral')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wide rounded-md border-2 transition-all duration-200 whitespace-normal wrap-break-word shadow-sm ${selectedTestId === 'geral'
                ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
              }`}
            >
              <Trophy className="w-3 h-3" /> Campeão da Modalidade
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            {modalityTests.length === 0 && <span className="text-xs text-gray-400 px-2">NENHUMA PROVA CADASTRADA</span>}
            {modalityTests.map(test => (
              <button
                key={test.id}
                onClick={() => setSelectedTestId(test.id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wide rounded-md border-2 transition-all duration-200 whitespace-normal wrap-break-word shadow-sm ${selectedTestId === test.id
                  ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                  : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                }`}
              >
                <Target className="w-3 h-3" /> {test.title}
              </button>
            ))}
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden relative min-h-96">
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-k9-orange via-yellow-500 to-k9-orange"></div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[0.65rem] tracking-[0.2em] font-black border-b border-gray-100">
                <tr>
                  <th className="p-5 text-center w-24">Pos</th>
                  <th className="p-5">Competidor (Binômio)</th>
                  <th className="p-5">Raça</th>
                  <th className="p-5 text-center">Provas</th>
                  <th className="p-5 text-right">Pontuação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 font-mono animate-pulse">CARREGANDO DADOS...</td>
                  </tr>
                )}

                {!loading && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-gray-400 font-mono">
                      <div className="flex flex-col items-center gap-3">
                        <ListFilter className="w-10 h-10 opacity-20" />
                        <span>SEM COMPETIDORES NESTA CATEGORIA</span>
                      </div>
                    </td>
                  </tr>
                )}

                {filteredData.map((entry, index) => (
                  <tr key={entry.id} className={`hover:bg-orange-50/50 transition-colors group ${index < 3 ? 'bg-orange-50/10' : ''}`}>
                    <td className="p-5 text-center">
                      <div className={`font-black text-2xl md:text-3xl ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-gray-300'} flex justify-center items-center`}>
                        {index < 3 ? (
                          index === 0 ? <Crown className="w-8 h-8 md:w-10 md:h-10 fill-current opacity-80" /> : <Medal className="w-8 h-8 md:w-10 md:h-10 fill-current opacity-80" />
                        ) : (
                          <span className="text-gray-400 group-hover:text-k9-orange transition-colors">#{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-5">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${index < 3 ? 'bg-k9-orange text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {entry.handlerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-k9-black uppercase tracking-tight text-base md:text-lg group-hover:text-k9-orange transition-colors">{entry.handlerName}</div>
                          <div className="text-[11px] md:text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mt-0.5">
                            <Flame className="w-3 h-3 text-k9-orange" /> Cão: <span className="text-gray-800">{entry.dogName}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-xs md:text-sm text-gray-400 uppercase tracking-widest font-semibold hidden md:table-cell">
                      {entry.dogBreed}
                    </td>
                    <td className="p-5 text-center text-xs md:text-sm font-bold text-gray-400">
                      {selectedTestId === 'geral' ? (
                         <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">{entry.currentCount}</span>
                      ) : (
                        entry.currentCount > 0 ? <span className="text-green-600">Concluída</span> : <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-2xl md:text-4xl font-black text-k9-black tracking-tighter leading-none group-hover:scale-110 transition-transform origin-right">
                          {entry.currentScore.toFixed(1)}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pontos</span>
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