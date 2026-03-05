'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getModalities } from '@/services/adminService';
import { TestTemplate, Room } from '@/types/schema';
import { FileText, ClipboardCheck, Info, Users, Shield, AlertTriangle, Calendar } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import RoomSelect from '@/components/RoomSelect';
import RoomCountdown from '@/components/RoomCountdown';
import { useTranslation } from 'react-i18next';
import '@/i18n/config';

export default function TestsPage() {
    const { t } = useTranslation();
    const [tests, setTests] = useState<TestTemplate[]>([]);
    const [modalities, setModalities] = useState<string[]>([]);
    const [selectedModality, setSelectedModality] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');

    useEffect(() => {
        const fetchMods = async () => {
            try {
                const mods = await getModalities();
                const validModalityNames = mods.map(m => m.name);
                setModalities(validModalityNames);
                setSelectedModality(null);
            } catch (e) {
                console.error("Error fetching modalities", e);
            }
        };
        fetchMods();

        const q = query(collection(db, 'rooms'), where('active', '==', true));
        const unsubRooms = onSnapshot(q, (snap) => {
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
        });

        return () => unsubRooms();
    }, []);

    useEffect(() => {
        if (!selectedRoomId) {
            setTests([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const qTests = query(collection(db, 'tests'), where('roomId', '==', selectedRoomId));
        const unsubTests = onSnapshot(qTests, (snap) => {
            const t = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestTemplate));
            t.sort((a, b) => (a.testNumber ?? 999) - (b.testNumber ?? 999));
            setTests(t);
            setLoading(false);
        });

        localStorage.setItem('lastVisitedRoomId', selectedRoomId);

        return () => unsubTests();
    }, [selectedRoomId]);

    // Agrupar provas por modalidade
    const grouped: Record<string, TestTemplate[]> = {};
    const displayModalities = selectedModality ? [selectedModality] : modalities;
    displayModalities.forEach(mod => {
        const group = tests.filter(t => t.modality === mod);
        if (group.length > 0) grouped[mod] = group;
    });

    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3">
                            <FileText className="w-8 h-8 text-k9-orange" />
                            {t('testsPage.title')}
                        </h1>
                        <p className="text-gray-500 text-sm uppercase tracking-widest pl-11 mt-1">
                            {t('testsPage.subtitle')}
                        </p>
                    </div>

                    {/* Botão Ver Competidores */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                        <div className="w-full sm:w-auto max-w-md">
                            <RoomSelect
                                value={selectedRoomId}
                                onChange={setSelectedRoomId}
                                rooms={rooms}
                            />
                        </div>
                        <Link
                            href="/competitors"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-400 text-white font-black uppercase text-sm tracking-wider rounded-lg border-2 border-orange-400 hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-sm whitespace-nowrap w-full sm:w-auto"
                        >
                            <Users className="w-4 h-4" />
                            {t('testsPage.viewCompetitors')}
                        </Link>
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

                {/* Tabs de Modalidade */}
                {!loading && modalities.length > 0 && (
                    <div className="mb-8 overflow-x-auto pb-4">
                        <div className="flex gap-6 min-w-max px-3">
                            <button
                                onClick={() => setSelectedModality(null)}
                                className={`px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 origin-left transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer
                                    ${selectedModality === null
                                        ? 'bg-orange-400 text-white border-orange-400 shadow-md scale-105'
                                        : 'bg-white text-black border-gray-300 hover:bg-orange-400 hover:text-white hover:border-orange-400'
                                    }`}
                            >
                                {t('testsPage.all')}
                            </button>
                            {modalities.map(mod => (
                                <button
                                    key={mod}
                                    onClick={() => setSelectedModality(mod)}
                                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 origin-left transition-all duration-200 whitespace-nowrap shadow-sm cursor-pointer
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
                )}

                {/* Conteúdo */}
                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white border-2 border-gray-100 rounded-xl h-40 animate-pulse" />
                        ))}
                    </div>
                ) : tests.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <div className="text-gray-400 font-black uppercase tracking-widest">{t('testsPage.noTests')}</div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(grouped).map(([mod, modTests]) => (
                            <div key={mod}>
                                {/* Cabeçalho da modalidade */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-7 bg-orange-400 rounded-full" />
                                        <Shield className="w-5 h-5 text-orange-400" />
                                        <h2 className="text-base font-black uppercase tracking-widest text-k9-black">{mod}</h2>
                                    </div>
                                    <span className="text-xs text-gray-400 font-bold">— {modTests.length} {modTests.length !== 1 ? t('testsPage.test_other') : t('testsPage.test_one')}</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                {/* Lista de provas da modalidade */}
                                <div className="space-y-5">
                                    {modTests.map(test => (
                                        <div key={test.id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:border-orange-400 transition-all">

                                            {/* Topo do card */}
                                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Número da prova */}
                                                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex flex-col items-center justify-center text-white font-black shadow-sm shrink-0">
                                                        <span className="text-[8px] opacity-50 leading-none">Nº</span>
                                                        <span className="text-sm leading-none">{test.testNumber ? String(test.testNumber).padStart(2, '0') : '--'}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-k9-black uppercase tracking-wide">{test.title}</h3>
                                                        {test.description && (
                                                            <p className="text-gray-500 text-xs mt-0.5">{test.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-200 rounded-lg text-orange-600 font-bold text-sm uppercase tracking-wider whitespace-nowrap shrink-0">
                                                    <ClipboardCheck className="w-4 h-4" />
                                                    {t('testsPage.max')} {test.maxScore} {t('competitorsPage.pts')}
                                                </div>
                                            </div>

                                            {/* Corpo: critérios + penalidades */}
                                            <div className="p-5 grid md:grid-cols-2 gap-8">
                                                {/* Critérios */}
                                                <div>
                                                    <h4 className="text-xs font-black text-k9-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b-2 border-orange-400 pb-2">
                                                        <Info className="w-4 h-4 text-orange-400" /> {t('testsPage.criteria')}
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {test.groups.length === 0 ? (
                                                            <p className="text-xs text-gray-400 italic">{t('testsPage.noCriteria')}</p>
                                                        ) : test.groups.map((group, idx) => (
                                                            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                                                                <div className="font-bold text-k9-black mb-2 border-b border-gray-300 pb-1 text-xs uppercase tracking-wider">{group.name}</div>
                                                                <ul className="space-y-1">
                                                                    {group.items.map(item => (
                                                                        <li key={item.id} className="text-gray-600 text-xs">
                                                                            <div className="flex justify-between">
                                                                                <span>• {item.label}</span>
                                                                                <span className="text-gray-800 font-mono font-bold ml-2 shrink-0">{item.maxPoints} {t('competitorsPage.pts')}</span>
                                                                            </div>
                                                                            {item.description && (
                                                                                <p className="text-gray-400 text-[10px] mt-0.5 pl-3 leading-relaxed">{item.description}</p>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Penalidades */}
                                                <div>
                                                    <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b-2 border-red-400 pb-2">
                                                        <AlertTriangle className="w-4 h-4" /> {t('testsPage.penalties')}
                                                    </h4>
                                                    {test.penalties.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">{t('testsPage.noPenalties')}</p>
                                                    ) : (
                                                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                                            <ul className="space-y-2">
                                                                {test.penalties.map(p => (
                                                                    <li key={p.id} className="flex justify-between text-xs text-red-700 font-semibold">
                                                                        <span>{p.label}</span>
                                                                        <span className="font-mono">{p.value} {t('competitorsPage.pts')}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
