'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Gavel, LogOut, ShieldAlert, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { Room } from '@/types/schema';
import { getRoomsWhereJudge } from '@/services/adminService';
import { useTranslation } from 'react-i18next';
import RoomCountdown from '@/components/RoomCountdown';

export default function JudgeDashboard() {
    const router = useRouter();
    const { t } = useTranslation();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [searchRoom, setSearchRoom] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [loading, setLoading] = useState(true);
    const [authDetermined, setAuthDetermined] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                if (authDetermined || !auth.currentUser) {
                    router.push('/secret-access');
                }
                setAuthDetermined(true);
                return;
            }

            setAuthDetermined(true);
            try {
                const myRooms = await getRoomsWhereJudge(currentUser.uid);
                setRooms(myRooms);
            } catch (error) {
                console.error("Error fetching judge rooms", error);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router, authDetermined]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">{t('judge.loading')}</div>;

    const filteredRooms = rooms
        .filter(room => room.name.toLowerCase().includes(searchRoom.toLowerCase()) || (room.description && room.description.toLowerCase().includes(searchRoom.toLowerCase())))
        .sort((a, b) => {
            const result = a.name.localeCompare(b.name);
            return sortOrder === 'asc' ? result : -result;
        });

    return (
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6 bg-black border-b-4 border-k9-orange p-5 md:p-6 py-6 md:py-8 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between text-white relative">
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-k9-orange/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>
                    <div className="relative z-10 flex items-center gap-4 md:gap-5 w-full md:w-auto">
                        <div className="h-12 w-12 md:h-16 md:w-16 relative flex items-center justify-center p-1 bg-white/5 rounded-xl border border-white/10 shadow-inner shrink-0">
                            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1 truncate">
                                {t('judge.areaTitle')}
                            </h1>
                            <p className="text-k9-orange text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black opacity-80">{t('judge.subtitle')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 md:mt-0 relative z-20 w-full md:w-auto justify-end">
                        <button
                            onClick={handleLogout}
                            className="text-white hover:text-red-400 text-[10px] md:text-xs font-black uppercase flex items-center gap-2 transition-all border-b-2 border-red-900 bg-red-600/10 hover:bg-red-600/20 px-3 py-2 md:px-4 md:py-2.5 rounded-lg shadow-sm cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('judge.logout')}
                        </button>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-k9-black text-lg font-black uppercase flex items-center gap-2 tracking-tight">
                        <ShieldAlert className="w-5 h-5 text-k9-orange" /> {t('judge.assignedOps')}
                    </h2>
                    
                    <div className="flex flex-col md:flex-row items-stretch gap-3">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder={t('judge.searchRooms', 'Buscar salas...')}
                                value={searchRoom}
                                onChange={e => setSearchRoom(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-k9-black focus:border-k9-orange focus:ring-2 focus:ring-k9-orange/20 transition-all outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="bg-white border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors shrink-0"
                            title="Alternar ordem de classificação"
                        >
                            {sortOrder === 'asc' ? 'A-Z ↓' : 'Z-A ↑'}
                        </button>
                    </div>
                </div>

                {filteredRooms.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-600 bg-gray-50 font-semibold">
                        {rooms.length === 0 ? t('judge.noRooms') : t('judge.noRoomsFound', 'Nenhuma sala encontrada.')}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => router.push(`/judge/room/${room.id}`)}
                                className="group w-full text-left cursor-pointer"
                            >
                                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-k9-orange hover:shadow-lg transition-all relative overflow-hidden h-full flex flex-col">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-k9-orange/5 to-transparent"></div>

                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-k9-orange/10 rounded-lg text-k9-orange group-hover:scale-110 transition-transform border-2 border-k9-orange/30">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border-2 ${room.active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                                            {room.active ? t('judge.inProgress') : t('judge.finished')}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-k9-black uppercase leading-tight mb-1 group-hover:text-k9-orange transition-colors tracking-tight text-left">
                                        {room.name}
                                    </h3>
                                    <div className="mb-3">
                                        <RoomCountdown room={room} variant="light" />
                                    </div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-6 font-semibold line-clamp-2 text-left">
                                        {room.description}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500 border-t-2 border-gray-200 pt-4 font-bold w-full">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 shrink-0" />
                                            {room.startDate ? (
                                                <span className="text-k9-black font-black">
                                                    {new Date(room.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                    {room.endDate && room.endDate !== room.startDate && (
                                                        <> - {new Date(room.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
                                                    )}
                                                </span>
                                            ) : (
                                                <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-k9-orange group-hover:translate-x-1 transition-transform">
                                            {t('judge.access')} <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
