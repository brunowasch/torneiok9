'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getAllCompetitors } from '@/services/rankingService';
import { getModalities } from '@/services/adminService';
import { Competitor, Evaluation, TestTemplate, AppUser } from '@/types/schema';
import { Users, Search, Flame, Shield, Calendar } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import RoomSelect from '@/components/RoomSelect';
import RoomCountdown from '@/components/RoomCountdown';
import { Room } from '@/types/schema';
import { useTranslation } from 'react-i18next';
import '@/i18n/config';


export default function CompetitorsPage() {
    const { t } = useTranslation();
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [loading, setLoading] = useState(true);
    const [modalities, setModalities] = useState<string[]>([]);
    const [selectedModality, setSelectedModality] = useState<string | null>(null); // null = Todos
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
            setCompetitors([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const qComps = query(collection(db, 'competitors'), where('roomId', '==', selectedRoomId));
        const unsubComps = onSnapshot(qComps, (snap) => {
            const comps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
            setCompetitors(comps);
            setLoading(false);
        });

        localStorage.setItem('lastVisitedRoomId', selectedRoomId);

        return () => unsubComps();
    }, [selectedRoomId]);


    // Competidores filtrados pela busca + modalidade + ordenação
    const filteredCompetitors = competitors.filter(c => {
        const matchesMod = !selectedModality || c.modality === selectedModality;
        const matchesSearch = !search ||
            c.handlerName.toLowerCase().includes(search.toLowerCase()) ||
            c.dogName.toLowerCase().includes(search.toLowerCase()) ||
            c.dogBreed?.toLowerCase().includes(search.toLowerCase());
        return matchesMod && matchesSearch;
    }).sort((a, b) => sortOrder === 'asc' ? a.handlerName.localeCompare(b.handlerName) : b.handlerName.localeCompare(a.handlerName));

    // Quando "Todos": agrupar por modalidade
    const groupedByModality: Record<string, Competitor[]> = {};
    if (!selectedModality) {
        modalities.forEach(mod => {
            const group = filteredCompetitors.filter(c => c.modality === mod);
            if (group.length > 0) groupedByModality[mod] = group;
        });
    }

    // Contar por modalidade para os badges
    const countByModality = (mod: string) =>
        competitors.filter(c => c.modality === mod).length;

    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3">
                            <Users className="w-8 h-8 text-k9-orange" />
                            {t('competitorsPage.title')}
                        </h1>
                        <p className="text-gray-500 text-sm uppercase tracking-widest pl-11 mt-1">{t('competitorsPage.subtitle')}</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <div className="relative w-full md:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl bg-white text-k9-black placeholder-gray-400 focus:outline-none focus:border-k9-orange focus:ring-2 focus:ring-orange-100 text-sm uppercase tracking-wider transition-all shadow-sm"
                                placeholder={t('competitorsPage.search')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="px-4 py-3 text-sm font-black uppercase tracking-wider rounded-xl border-2 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 bg-white text-gray-600 border-gray-200 hover:bg-gray-50 active:scale-95 shrink-0"
                            title="Alternar ordem de classificação"
                        >
                            {sortOrder === 'asc' ? 'A-Z ↓' : 'Z-A ↑'}
                        </button>
                    </div>

                    <div className="w-full md:w-auto max-w-md mx-auto md:mx-0 mt-4 md:mt-0">
                        <RoomSelect
                            value={selectedRoomId}
                            onChange={setSelectedRoomId}
                            rooms={rooms}
                        />
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

                {/* Tabs: Todos + Modalidades */}
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
                                {t('competitorsPage.all')}
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


                {/* Grid / Grouped List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl animate-pulse h-32"></div>
                        ))}
                    </div>
                ) : selectedModality === null ? (
                    <div className="space-y-10">
                        {Object.keys(groupedByModality).length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <div className="text-gray-400 font-black uppercase tracking-widest">{t('competitorsPage.noCompetitor')}</div>
                            </div>
                        ) : (
                            Object.entries(groupedByModality).map(([mod, comps]) => (
                                <div key={mod}>
                                    {/* Cabeçalho da modalidade */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-6 bg-k9-orange rounded-full"></div>
                                            <Shield className="w-4 h-4 text-k9-orange" />
                                            <h2 className="text-sm font-black uppercase tracking-widest text-k9-black">{mod}</h2>
                                        </div>
                                        <span className="text-xs text-gray-400 font-bold">— {comps.length} {comps.length !== 1 ? t('competitorsPage.competitor_other') : t('competitorsPage.competitor_one')}</span>
                                        <div className="flex-1 h-px bg-gray-100"></div>
                                    </div>
                                    <CompetitorGrid comps={comps} t={t} />
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-5 bg-k9-orange rounded-full"></div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-k9-black">{selectedModality}</h2>
                            <span className="text-xs text-gray-400 font-bold">— {filteredCompetitors.length} {filteredCompetitors.length !== 1 ? t('competitorsPage.competitor_other') : t('competitorsPage.competitor_one')}</span>
                        </div>
                        {filteredCompetitors.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <div className="text-gray-400 font-black uppercase tracking-widest">{t('competitorsPage.noCompetitor')}</div>
                            </div>
                        ) : (
                            <CompetitorGrid comps={filteredCompetitors} t={t} />
                        )}
                    </div>
                )}
            </main>

        </div>
    );
}

/* ─── Sub-componente: Grid de Cards de Competidores ─── */
function CompetitorGrid({
    comps,
    t
}: {
    comps: Competitor[];
    t: any;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {comps.map(comp => (
                <div
                    key={comp.id}
                    className="bg-white border-2 border-gray-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left relative overflow-hidden"
                >
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-sm overflow-hidden bg-orange-50 text-orange-600 border-2 border-orange-100 group-hover:border-k9-orange transition-colors">
                        {comp.photoUrl ? (
                            <img src={comp.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span>{comp.handlerName.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black text-k9-black uppercase leading-tight tracking-tight truncate group-hover:text-k9-orange transition-colors">
                            {comp.handlerName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Flame className="w-3 h-3 text-k9-orange shrink-0" />
                            <span className="text-[10px] font-black text-gray-400 uppercase">{t('competitorsPage.dog')}:</span>
                            <span className="text-xs font-bold text-gray-700 truncate uppercase">{comp.dogName}</span>
                        </div>
                        <div className="mt-2">
                            <span className="text-[9px] text-gray-400 uppercase font-black px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 tracking-widest">
                                {comp.dogBreed || t('competitorsPage.breedNotDefined')}
                            </span>
                        </div>
                    </div>


                    {/* Decorative */}
                    <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Flame className="w-20 h-20 text-k9-orange rotate-12" />
                    </div>
                </div>
            ))}
        </div>
    );
}
