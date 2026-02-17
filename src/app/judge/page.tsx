'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Gavel, LogOut, ShieldAlert, ChevronRight, MapPin, Calendar } from 'lucide-react';
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
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 bg-black border-b-4 border-k9-orange p-6 rounded-xl shadow-lg flex items-center justify-between text-white -mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-k9-orange/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="h-14 w-14 relative flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
                                Área do Juiz
                            </h1>
                            <p className="text-gray-400 text-sm uppercase tracking-widest font-bold mt-1">Painel de Avaliação Tática</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-white hover:text-red-400 text-xs font-bold uppercase flex items-center gap-2 transition-colors border border-gray-700 bg-gray-900 px-4 py-3 rounded-lg hover:border-red-500/50 hover:bg-red-900/10 relative z-10 shadow-sm"
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
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => router.push(`/judge/room/${room.id}`)}
                                className="group w-full text-left"
                            >
                                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-k9-orange hover:shadow-lg transition-all relative overflow-hidden h-full flex flex-col">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-k9-orange/5 to-transparent"></div>
                                    
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-k9-orange/10 rounded-lg text-k9-orange group-hover:scale-110 transition-transform border-2 border-k9-orange/30">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border-2 ${room.active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                                            {room.active ? 'Em Progresso' : 'Encerrada'}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-k9-black uppercase leading-tight mb-2 group-hover:text-k9-orange transition-colors tracking-tight text-left">
                                        {room.name}
                                    </h3>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-6 font-semibold line-clamp-2 text-left">
                                        {room.description}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500 border-t-2 border-gray-200 pt-4 font-bold w-full">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(room.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1 text-k9-orange group-hover:translate-x-1 transition-transform">
                                            ACESSAR <ChevronRight className="w-3 h-3" />
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
