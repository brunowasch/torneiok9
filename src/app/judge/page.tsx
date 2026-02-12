'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Gavel, MapPin, Calendar, ChevronRight, LogOut, ShieldAlert } from 'lucide-react';
import { Room } from '@/types/schema';
import { getRoomsWhereJudge } from '@/services/adminService';

export default function JudgeDashboard() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/secret-access');
                return;
            }
            try {
                // Ensure service exists or create it
                const myRooms = await getRoomsWhereJudge(currentUser.uid);
                setRooms(myRooms);
            } catch (error) {
                console.error("Error fetching judge rooms", error);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (loading) return <div className="min-h-screen bg-k9-white flex items-center justify-center text-k9-orange font-mono">[CARREGANDO ACESSO DO JUIZ...]</div>;

    return (
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 border-b-2 border-gray-200 pb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3">
                            <Gavel className="text-k9-orange w-6 h-6" />
                            Área do Juiz
                        </h1>
                        <p className="text-gray-500 text-xs uppercase tracking-widest pl-9 font-bold">Painel de Avaliação Tática</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-red-600 hover:text-red-700 text-xs font-bold uppercase flex items-center gap-2 transition-colors border-2 border-red-200 px-4 py-2 rounded-lg hover:bg-red-50"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </header>

                <h2 className="text-k9-black text-lg font-black uppercase mb-6 flex items-center gap-2 tracking-tight">
                    <ShieldAlert className="w-5 h-5 text-k9-orange" /> Operações Atribuídas
                </h2>

                {rooms.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-600 bg-gray-50 font-semibold">
                        Você não foi atribuído a nenhuma sala de competição ainda.
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {rooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => router.push(`/judge/room/${room.id}`)}
                                className="bg-white border-2 border-gray-200 p-6 rounded-xl text-left hover:border-k9-orange hover:shadow-lg transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-k9-orange/5 to-transparent"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-k9-orange/10 rounded-lg text-k9-orange border-2 border-k9-orange/30">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border-2 ${room.active ? 'text-green-700 bg-green-100 border-green-300' : 'text-red-700 bg-red-100 border-red-300'}`}>
                                        {room.active ? 'Em Andamento' : 'Encerrada'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-k9-black uppercase mb-1 group-hover:text-k9-orange transition-colors tracking-tight">{room.name}</h3>
                                <p className="text-xs text-gray-600 mb-6 line-clamp-2 font-semibold">{room.description}</p>

                                <div className="pt-4 border-t-2 border-gray-200 flex justify-between items-center text-xs text-gray-600 font-bold">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(room.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-k9-orange group-hover:translate-x-1 transition-transform">
                                        ACESSAR <ChevronRight className="w-3 h-3" />
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
