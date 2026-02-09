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
    const [user, setUser] = useState<any>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/secret-access');
                return;
            }
            setUser(currentUser);
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

    if (loading) return <div className="min-h-screen bg-tactical-black flex items-center justify-center text-police-gold font-mono">[CARREGANDO ACESSO DO JUIZ...]</div>;

    return (
        <div className="min-h-screen bg-tactical-black p-4 md:p-8 text-gray-200">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 border-b border-gray-800 pb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <Gavel className="text-police-gold w-6 h-6" />
                            Área do Juiz
                        </h1>
                        <p className="text-gray-500 text-xs uppercase tracking-widest pl-9">Painel de Avaliação Tática</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-red-500 hover:text-white text-xs font-bold uppercase flex items-center gap-2 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </header>

                <h2 className="text-white text-lg font-bold uppercase mb-6 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-police-gold" /> Operações Atribuídas
                </h2>

                {rooms.length === 0 ? (
                    <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center text-gray-500 bg-white/5">
                        Você não foi atribuído a nenhuma sala de competição ainda.
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {rooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => router.push(`/judge/room/${room.id}`)} // Will create this next
                                className="bg-tactical-gray border border-gray-800 p-6 rounded-xl text-left hover:border-police-gold transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-black/40 rounded-lg text-police-gold">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${room.active ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                                        {room.active ? 'Em Andamento' : 'Encerrada'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white uppercase mb-1 group-hover:text-police-gold transition-colors">{room.name}</h3>
                                <p className="text-xs text-gray-500 mb-6 line-clamp-2">{room.description}</p>

                                <div className="pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(room.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1 font-bold text-police-gold group-hover:translate-x-1 transition-transform">
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
