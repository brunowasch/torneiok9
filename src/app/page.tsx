'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RoomSelect from '@/components/RoomSelect';
import { Room, TestTemplate, Modality, INITIAL_MODALITIES, ModalityConfig, Competitor } from '@/types/schema';
import { getModalities } from '@/services/adminService';
import { Trophy, Medal, Crown, ListFilter, Target, Flame, Calendar, Clock } from 'lucide-react';
import { LeaderboardEntry, subscribeToLeaderboard } from '@/services/rankingService';
import RoomCountdown from '@/components/RoomCountdown';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import '@/i18n/config';

export default function Home() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tests, setTests] = useState<TestTemplate[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | 'geral'>('geral');
  const [loading, setLoading] = useState(true);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);
  const [isFrozenState, setIsFrozenState] = useState(false);
  const [latestLeaderboardData, setLatestLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [publicSortBy, setPublicSortBy] = useState<'score' | 'number'>('score');
  const [publicSortOrder, setPublicSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasLoggedInBefore(localStorage.getItem('hasLoggedInBefore') === 'true');
    }
  }, []);

  useEffect(() => {
    let unsubscribeRooms: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;

    const setup = async () => {
      try {
        const { onAuthStateChanged, signInAnonymously } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            try {
              await signInAnonymously(auth);
            } catch (e) {
              console.error('Error signing in anonymously', e);
            }
            return;
          }

          if (!user.isAnonymous) {
            try {
              const { getUserRole } = await import('@/services/userService');
              const role = await getUserRole(user.uid);
              setAuthRole(role);
            } catch (e) {
              console.error('Error fetching user role', e);
            }
          } else {
            setAuthRole(null);
          }

          try {
            const { collection, query, onSnapshot, where } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const fetchedModalities = await getModalities();
            const modalityNames = fetchedModalities.length > 0
              ? fetchedModalities.map(m => m.name)
              : INITIAL_MODALITIES;
            setModalities(modalityNames);
            if (modalityNames.length > 0) setSelectedModality(modalityNames[0]);

            const q = query(collection(db, 'rooms'), where('active', '==', true));

            if (unsubscribeRooms) unsubscribeRooms();
            unsubscribeRooms = onSnapshot(
              q,
              (snap) => {
                const roomsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
                setRooms(roomsData);

                setSelectedRoomId(prev => {
                  const saved = localStorage.getItem('lastVisitedRoomId');
                  if ((!prev || prev === '') && roomsData.length > 0) {
                    if (saved && roomsData.find(r => r.id === saved)) return saved;
                    return roomsData[0].id;
                  }
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
            console.error('Error fetching initial data', e);
            setLoading(false);
          }
        });
      } catch (e) {
        console.error('Error setting up auth listener', e);
        setLoading(false);
      }
    };

    setup();

    return () => {
      if (unsubscribeRooms) unsubscribeRooms();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      setTests([]);
      setLeaderboard([]);
      return;
    }

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
      setLatestLeaderboardData(data);
    });

    return () => {
      if (unsubscribeTests) unsubscribeTests();
      if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    };
  }, [selectedRoomId]);

  useEffect(() => {
    const currentRoom = rooms.find(r => r.id === selectedRoomId);
    const isModalityFrozen = currentRoom?.frozenModalities?.includes(selectedModality || '');
    const isGlobalFrozen = currentRoom?.allFrozen;
    const frozen = !!(isGlobalFrozen || isModalityFrozen);

    setIsFrozenState(frozen);

    if (!frozen) {
      setLeaderboard(latestLeaderboardData);
    }
    // If frozen, we don't update setLeaderboard, so it stays at its last value
  }, [rooms, selectedRoomId, selectedModality, latestLeaderboardData]);

  useEffect(() => {
    if (selectedRoomId) localStorage.setItem('lastVisitedRoomId', selectedRoomId);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedModality && modalities.length > 0) {
      setSelectedModality(modalities[0]);
    }
  }, [selectedModality, modalities]);

  const getFilteredLeaderboard = () => {
    if (!selectedModality) return [];

    const modalityTests = tests.filter(t => t.modality === selectedModality);
    const modalityTestIds = modalityTests.map(t => t.id);

    return leaderboard
      .filter(entry => entry.modality === selectedModality)
      .map(entry => {
        let score = 0;
        let count = 0;
        let hasNC = false;

        if (selectedTestId === 'geral') {
          modalityTestIds.forEach(tId => {
            if (entry.scoresByTest[tId] !== undefined && entry.scoresByTest[tId] > 0) {
              score += entry.scoresByTest[tId];
              count++;
            }
          });
        } else {
          const ev = entry.evaluations.find(e => e.testId === selectedTestId);
          if (ev?.status === 'did_not_participate') {
            hasNC = true;
            count = 1;
          } else if (entry.scoresByTest[selectedTestId] !== undefined && entry.scoresByTest[selectedTestId] > 0) {
            score = entry.scoresByTest[selectedTestId];
            count = 1;
          }
        }

        return { ...entry, currentScore: score, currentCount: count, isNC: hasNC };
      })
      .sort((a, b) => {
        if (publicSortBy === 'number') {
          const numA = a.competitorNumber || 99999;
          const numB = b.competitorNumber || 99999;
          return publicSortOrder === 'asc' ? numA - numB : numB - numA;
        }

        // Competidores sem avaliação vão para o final
        const aHasEval = a.currentCount > 0;
        const bHasEval = b.currentCount > 0;
        if (aHasEval && !bHasEval) return -1;
        if (!aHasEval && bHasEval) return 1;

        // Entre os que têm avaliação, ordena por score desc; empate: alfabético
        let comparison = 0;
        if (b.currentScore !== a.currentScore) {
          comparison = b.currentScore - a.currentScore;
        } else {
          comparison = a.handlerName.localeCompare(b.handlerName);
        }
        return publicSortOrder === 'desc' ? comparison : -comparison;
      });
  };

  const filteredData = getFilteredLeaderboard();
  const modalityTests = tests
    .filter(t => t.modality === selectedModality)
    .sort((a, b) => (a.testNumber ?? 999) - (b.testNumber ?? 999));

  return (
    <div className="min-h-screen bg-white text-k9-black font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-10 gap-6 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start shrink-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-2 md:gap-3 leading-none">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-k9-orange shrink-0" />
              {t('home.title')}
            </h1>
            <p className="text-gray-500 text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.2em] md:pl-16 mt-2">{t('home.subtitle')}</p>
          </div>

          <div className="w-full md:w-auto mx-auto md:mx-0 flex flex-col md:flex-row items-center gap-4">
            {authRole ? (
              <Link
                href={authRole === 'admin' ? '/admin' : '/judge'}
                className="px-4 py-2.5 bg-k9-black text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg border-2 border-k9-black hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap"
              >
                {authRole === 'admin' ? t('home.returnAdmin', 'VOLTAR PARA ADMIN') : t('home.returnJudge', 'VOLTAR À AVALIAÇÃO')}
              </Link>
            ) : hasLoggedInBefore ? (
              <Link
                href="/secret-access"
                className="px-4 py-2.5 bg-k9-black text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg border-2 border-k9-black hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap"
              >
                {t('home.accessEvaluation', 'ÁREA DE AVALIAÇÃO')}
              </Link>
            ) : null}
            <div className="w-full md:w-auto max-w-md">
              <RoomSelect
                value={selectedRoomId}
                onChange={setSelectedRoomId}
                rooms={rooms}
              />
            </div>
          </div>
        </div>

        {/* Room Date & Countdown Badge */}
        {(() => {
          const selectedRoom = rooms.find(r => r.id === selectedRoomId);
          if (!selectedRoom?.startDate) return null;
          return (
            <div className="flex flex-col items-center md:items-start gap-3 -mt-4 mb-6">
              <div className="inline-flex items-center gap-2 bg-k9-orange/10 border border-k9-orange/30 text-k9-orange px-4 py-2 rounded-full">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {new Date(selectedRoom.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {selectedRoom.endDate && selectedRoom.endDate !== selectedRoom.startDate && (
                    <> - {new Date(selectedRoom.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</>
                  )}
                </span>
              </div>
              <RoomCountdown room={selectedRoom} variant="light" />
            </div>
          );
        })()}

        {/* Modality Tabs */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth">
          <div className="flex gap-4 md:gap-6 min-w-max">
            {modalities.map(mod => (
              <button
                key={mod}
                onClick={() => { setSelectedModality(mod); setSelectedTestId('geral'); }}
                className={`px-5 py-2.5 md:px-6 md:py-3 text-xs md:text-sm font-black uppercase tracking-wider rounded-lg border-2 
                transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer
                ${selectedModality === mod
                    ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                    : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                  }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Status Alert for Frozen Visualization */}
        {isFrozenState && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <Clock className="text-amber-600 w-5 h-5 shrink-0" />
              <div>
                <p className="text-amber-800 font-black uppercase text-xs tracking-wider">Visualização Paralisada</p>
                <p className="text-amber-600 text-[10px] font-bold uppercase mt-0.5">As notas estão sendo processadas e serão atualizadas em breve.</p>
              </div>
            </div>
          </div>
        )}

        {/* Test Selector (Sub-nav) */}
        {selectedModality && (
          <div className="mb-8 -mx-4 px-4 overflow-x-auto pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 min-w-max">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
                <button
                  onClick={() => setSelectedTestId('geral')}
                  className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-wide rounded-md border-2 transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer ${selectedTestId === 'geral'
                    ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                    : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                    }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" /> {t('home.modalityChampion')}
                  </div>
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                {modalityTests.length === 0 && <span className="text-xs text-gray-400 px-2">{t('home.noTestsRegistered')}</span>}
                {modalityTests.map(test => (
                  <button
                    key={test.id}
                    onClick={() => setSelectedTestId(test.id)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-wide rounded-md border-2 transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer ${selectedTestId === test.id
                      ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                      : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3" /> {test.title}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <select
                  value={publicSortBy}
                  onChange={(e) => setPublicSortBy(e.target.value as any)}
                  className="bg-white border-2 border-gray-100 text-[10px] font-black uppercase tracking-wider rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400 transition-all shadow-sm"
                >
                  <option value="score">Nota</option>
                  <option value="number">Nº Sorteio</option>
                </select>
                <button
                  onClick={() => setPublicSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="bg-white border-2 border-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-black text-xs uppercase hover:bg-gray-50 transition-colors shadow-sm"
                >
                  {publicSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden relative min-h-96">
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-k9-orange via-yellow-500 to-k9-orange"></div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[0.6rem] md:text-[0.65rem] tracking-[0.2em] font-black border-b border-gray-100">
                <tr>
                  <th className="p-4 md:p-5 text-center w-16 md:w-24">{t('home.table.position')}</th>
                  <th className="p-4 md:p-5">{t('home.table.competitor')}</th>
                  <th className="p-5 hidden lg:table-cell">{t('home.table.breed')}</th>
                  <th className="p-5 text-center hidden sm:table-cell">{t('home.table.tests')}</th>
                  <th className="p-4 md:p-5 text-right">{t('home.table.score')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 font-mono animate-pulse">{t('home.loadingData')}</td>
                  </tr>
                )}

                {!loading && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-gray-400 font-mono">
                      <div className="flex flex-col items-center gap-3">
                        <ListFilter className="w-10 h-10 opacity-20" />
                        <span>{t('home.noCompetitorsInCategory')}</span>
                      </div>
                    </td>
                  </tr>
                )}

                {filteredData.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors group ${index < 3 ? 'bg-orange-50/10' : ''}`}
                    title={entry.handlerName}
                  >
                    <td className="p-4 md:p-5 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`font-black text-xl md:text-3xl ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-gray-300'} flex justify-center items-center relative`}>
                          {index < 3 ? (
                            <>
                              {index === 0 ? <Crown className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-current opacity-60" /> : <Medal className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-current opacity-60" />}
                              <span className="absolute text-[10px] sm:text-xs md:text-base font-black text-k9-black pt-1 sm:pt-2">{index + 1}º</span>
                            </>
                          ) : (
                            <span className="text-gray-400 group-hover:text-k9-orange transition-colors text-lg md:text-2xl">{index + 1}º</span>
                          )}
                        </div>
                        <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{t('home.table.place')}</span>
                      </div>
                    </td>
                    <td className="p-4 md:p-5">
                      <div className="flex items-center gap-3 md:gap-5">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold shrink-0 shadow-sm overflow-hidden bg-orange-50 text-orange-600 border border-orange-100`}>
                          {entry.photoUrl ? (
                            <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            entry.handlerName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-extrabold text-k9-black uppercase tracking-tight text-xs sm:text-sm md:text-lg group-hover:text-k9-orange transition-colors truncate max-w-[100px] sm:max-w-[200px] md:max-w-none">
                              {entry.handlerName}
                            </div>
                            {entry.competitorNumber && (
                              <span className="bg-k9-orange text-white text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm shrink-0">
                                Nº {entry.competitorNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mt-0.5">
                            <Flame className="w-2.5 h-2.5 md:w-3 md:h-3 text-k9-orange" /> {t('home.table.dog')}: <span className="text-gray-800 truncate">{entry.dogName}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-xs md:text-sm text-gray-400 uppercase tracking-widest font-semibold hidden lg:table-cell">
                      {entry.dogBreed}
                    </td>
                    <td className="p-5 text-center text-xs md:text-sm font-bold text-gray-400 hidden sm:table-cell">
                      {selectedTestId === 'geral' ? (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">{entry.currentCount}</span>
                      ) : (
                        entry.currentCount > 0 ? <span className="text-green-600 font-black">{t('home.table.completed')}</span> : <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-4 md:p-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-xl sm:text-2xl md:text-4xl font-black tracking-tighter leading-none group-hover:scale-110 transition-transform origin-right ${entry.isNC ? 'text-red-500' : 'text-k9-black'}`}>
                          {entry.isNC ? 'NC' : entry.currentScore.toFixed(1)}
                        </span>
                        <span className="text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{entry.isNC ? t('home.table.absence') : t('home.table.points')}</span>
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