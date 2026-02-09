'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createRoom, getRooms } from '@/services/adminService';
import { auth } from '@/lib/firebase';
import {
    PlusCircle,
    ShieldAlert,
    ChevronRight,
    MapPin,
    Calendar,
    Users
} from 'lucide-react';
import { Room } from '@/types/schema';
import { onAuthStateChanged } from 'firebase/auth';

export default function AdminDashboard() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [user, setUser] = useState<any>(null);

    // Admin Creation State
    const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchRooms(currentUser.uid);
            } else {
                console.log("No user logged in in Admin Dashboard");
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchRooms = async (uid: string) => {
        try {
            const data = await getRooms(uid);
            if (data.length === 0) {
                const all = await getRooms();
                const owned = all.filter(r => r.createdBy === uid);
                setRooms(owned.length > 0 ? owned : data);
            } else {
                setRooms(data);
            }
        } catch (e) {
            console.error("Error loading rooms", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        if (!newRoomName || !user) return;
        try {
            await createRoom({
                name: newRoomName,
                description: 'Torneio K9',
                active: true,
                createdBy: user.uid,
                judges: []
            });
            setNewRoomName('');
            setShowCreateModal(false);
            fetchRooms(user.uid);
        } catch (e) {
            alert('Erro ao criar sala. Verifique permissões.');
        }
    };

    const handleCreateAdmin = async () => {
        if (!newAdmin.email || !newAdmin.password || !newAdmin.name) return;
        try {
            const { createNewAdminByAdmin } = await import('@/services/userService');
            await createNewAdminByAdmin(newAdmin.email, newAdmin.password, newAdmin.name);
            alert('Novo Admin criado com sucesso!');
            setShowCreateAdminModal(false);
            setNewAdmin({ name: '', email: '', password: '' });
        } catch (e: any) {
            alert('Erro: ' + e.message);
        }
    };

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-tactical-black flex items-center justify-center p-4 text-white">
                <div className="text-center">
                    <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold uppercase">Acesso Restrito</h1>
                    <p className="text-gray-500 text-sm mt-2">Você deve estar logado para acessar esta área.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-tactical-black p-4 md:p-8 text-gray-200 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 border-b border-gray-800 pb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <ShieldAlert className="text-police-gold w-8 h-8" />
                            Comando Central
                        </h1>
                        <p className="text-police-gold text-sm uppercase tracking-widest pl-11">Dashboard Administrativo</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowCreateAdminModal(true)}
                            className="bg-gray-800 hover:bg-gray-700 text-white font-bold uppercase px-4 py-3 rounded tracking-widest transition-all flex items-center gap-2 text-xs cursor-pointer"
                        >
                            <Users className="w-4 h-4" />
                            Novo Admin
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white hover:bg-gray-200 text-black font-bold uppercase px-6 py-3 rounded tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] cursor-pointer"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Nova Operação
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center p-12 animate-pulse text-police-gold font-mono">[CONFIRMANDO CREDENCIAIS...]</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <Link href={`/admin/rooms/${room.id}`} key={room.id} className="group">
                                <div className="bg-tactical-gray border border-gray-800 rounded-xl p-6 hover:border-police-gold transition-all relative overflow-hidden h-full flex flex-col">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent"></div>

                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-black/40 rounded-lg text-police-gold group-hover:scale-110 transition-transform">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${room.active ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400'}`}>
                                            {room.active ? 'Em Progresso' : 'Finalizada'}
                                        </span>
                                    </div>

                                    <h2 className="text-xl font-bold text-white uppercase leading-tight mb-2 group-hover:text-police-gold transition-colors">
                                        {room.name}
                                    </h2>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-6">
                                        {room.description}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between text-xs text-gray-400 border-t border-gray-800 pt-4">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-bold text-police-gold group-hover:translate-x-1 transition-transform">
                                            GERENCIAR <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {rooms.length === 0 && (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-800 rounded-xl bg-white/[0.02]">
                                <p className="text-gray-500 uppercase font-bold tracking-widest mb-4">Nenhuma operação tática iniciada</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-police-gold hover:text-white underline uppercase text-xs tracking-wider"
                                >
                                    Criar primeira sala
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Create Room Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-tactical-gray border border-gray-700 p-8 rounded-xl w-full max-w-md shadow-2xl relative">
                            <h2 className="text-xl font-bold text-white uppercase mb-6 flex items-center gap-2">
                                <PlusCircle className="text-police-gold w-5 h-5" /> Nova Sala
                            </h2>
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded mb-6 focus:outline-none focus:border-police-gold uppercase"
                                placeholder="NOME DA OPERAÇÃO..."
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold uppercase text-xs rounded tracking-wider cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={!newRoomName}
                                    className="flex-1 py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase text-xs rounded tracking-wider disabled:opacity-50 cursor-pointer"
                                >
                                    Criar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Admin Modal */}
                {showCreateAdminModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-tactical-gray border border-gray-700 p-8 rounded-xl w-full max-w-md shadow-2xl relative">
                            <h2 className="text-xl font-bold text-white uppercase mb-6 flex items-center gap-2">
                                <Users className="text-police-gold w-5 h-5" /> Novo Administrador
                            </h2>
                            <div className="space-y-4 mb-6">
                                <input
                                    type="text"
                                    value={newAdmin.name}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                    className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                    placeholder="Nome..."
                                />
                                <input
                                    type="email"
                                    value={newAdmin.email}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                    className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                    placeholder="Email..."
                                />
                                <input
                                    type="password"
                                    value={newAdmin.password}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                    className="w-full bg-black/50 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-police-gold"
                                    placeholder="Senha..."
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCreateAdminModal(false)}
                                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold uppercase text-xs rounded tracking-wider cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateAdmin}
                                    className="flex-1 py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase text-xs rounded tracking-wider disabled:opacity-50 cursor-pointer"
                                >
                                    Criar Usuário
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
