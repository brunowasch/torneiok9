'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRoom, getRooms, deleteRoom } from '@/services/adminService';
import { auth } from '@/lib/firebase';
import {
    PlusCircle,
    ShieldAlert,
    ChevronRight,
    MapPin,
    Calendar,
    Users,
    LogOut,
    Menu,
    Trash2
} from 'lucide-react';
import { Room } from '@/types/schema';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

export default function AdminDashboard() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [user, setUser] = useState<User | null>(null);

    const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });

    const [roomToDelete, setRoomToDelete] = useState<{ id: string, name: string } | null>(null);

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

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
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
        } catch (err) {
            console.error('Error creating room', err);
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
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            alert('Erro: ' + msg);
        }
    };

    const handleDeleteRoom = (roomId: string, roomName: string) => {
        setRoomToDelete({ id: roomId, name: roomName });
    };

    const confirmDeleteRoom = async () => {
        if (!user || !roomToDelete) return;
        try {
            await deleteRoom(roomToDelete.id);
            setRoomToDelete(null);
            fetchRooms(user.uid);
        } catch (err) {
            console.error('Error deleting room', err);
            alert('Erro ao excluir sala.');
        }
    };

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-k9-white flex items-center justify-center p-4 text-k9-black">
                <div className="text-center">
                    <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold uppercase">Acesso Restrito</h1>
                    <p className="text-gray-500 text-sm mt-2">Você deve estar logado para acessar esta área.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-4 bg-black border-b-4 border-k9-orange p-6 rounded-xl shadow-lg flex items-center justify-between text-white -mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-k9-orange/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="h-14 w-14 relative flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
                                Comando Central
                            </h1>
                            <p className="text-gray-400 text-sm uppercase tracking-widest font-bold mt-1">Dashboard Administrativo</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleLogout}
                        className="text-white hover:text-red-400 text-xs font-bold uppercase flex items-center gap-2 transition-colors border border-gray-700 bg-gray-900 px-4 py-3 rounded-lg hover:border-red-500/50 hover:bg-red-900/10 relative z-10 shadow-sm"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </header>

                <div className="flex justify-end gap-4 mb-8">
                     <button
                        onClick={() => setShowCreateAdminModal(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-white font-bold uppercase px-4 py-3 rounded-lg tracking-widest transition-all flex items-center gap-2 text-xs cursor-pointer border border-gray-700 shadow-sm hover:border-k9-orange"
                    >
                        <Users className="w-4 h-4 text-k9-orange" />
                        Novo Admin
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-lg flex items-center gap-2 hover:scale-105 bg-k9-orange text-black border-k9-orange hover:bg-orange-500 hover:border-orange-500 hover:text-white"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Nova Sala
                    </button>
                </div>

                {loading ? (
                    <div className="text-center p-12 animate-pulse text-k9-orange font-mono">[CONFIRMANDO CREDENCIAIS...]</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <div key={room.id} className="relative group/card">
                                <Link href={`/admin/rooms/${room.id}`} className="group">
                                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-k9-orange hover:shadow-lg transition-all relative overflow-hidden h-full flex flex-col">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-k9-orange/5 to-transparent"></div>

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-k9-orange/10 rounded-lg text-k9-orange group-hover:scale-110 transition-transform border-2 border-k9-orange/30">
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border-2 ${room.active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                                                    {room.active ? 'Em Progresso' : 'Finalizada'}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteRoom(room.id, room.name);
                                                    }}
                                                    className="p-1.5 text-black hover:text-red-500 border-2 border-black hover:border-red-500 rounded-lg transition-all cursor-pointer z-10 bg-white shadow-sm"
                                                    title="Excluir Sala"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <h2 className="text-xl font-black text-k9-black uppercase leading-tight mb-2 group-hover:text-k9-orange transition-colors tracking-tight">
                                            {room.name}
                                        </h2>
                                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-6 font-semibold">
                                            {room.description}
                                        </p>

                                        <div className="mt-auto flex items-center justify-between text-xs text-gray-500 border-t-2 border-gray-200 pt-4 font-bold">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-k9-orange group-hover:translate-x-1 transition-transform">
                                                GERENCIAR <ChevronRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}

                        {rooms.length === 0 && (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                <p className="text-gray-600 uppercase font-bold tracking-widest mb-4">Nenhuma operação tática iniciada</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-k9-orange hover:text-k9-black underline uppercase text-xs tracking-wider font-bold transition-colors"
                                >
                                    Criar primeira sala
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Create Room Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white border-2 border-gray-200 p-8 rounded-xl w-full max-w-md shadow-2xl relative">
                            <h2 className="text-xl font-black text-k9-black uppercase mb-6 flex items-center gap-2 tracking-tight">
                                <PlusCircle className="text-k9-orange w-5 h-5" /> Nova Sala
                            </h2>
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg mb-6 focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange uppercase font-semibold placeholder-gray-400"
                                placeholder="NOME DA OPERAÇÃO..."
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-lg tracking-wider cursor-pointer border-2 border-gray-300 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={!newRoomName}
                                    className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-orange-400 text-white border-orange-400 hover:scale-105"
                                >
                                    Criar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Admin Modal */}
                {showCreateAdminModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white border-2 border-gray-200 p-8 rounded-xl w-full max-w-md shadow-2xl relative">
                            <h2 className="text-xl font-black text-k9-black uppercase mb-6 flex items-center gap-2 tracking-tight">
                                <Users className="text-k9-orange w-5 h-5" /> Novo Administrador
                            </h2>
                            <div className="space-y-4 mb-6">
                                <input
                                    type="text"
                                    value={newAdmin.name}
                                    required
                                    placeholder="Nome completo"
                                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                />
                                <input
                                    type="email"
                                    value={newAdmin.email}
                                    required
                                    placeholder="usuario@comando.k9"
                                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                />
                                <input
                                    type="password"
                                    value={newAdmin.password}
                                    required
                                    placeholder="Senha (mín. 8 caracteres)"
                                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCreateAdminModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-lg tracking-wider cursor-pointer border-2 border-gray-300 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateAdmin}
                                    disabled={!newAdmin.name || !newAdmin.email || !newAdmin.password}
                                    className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-orange-400 text-white border-orange-400 hover:scale-105"
                                >
                                    Criar Usuário
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Delete Confirmation Modal */}
                {roomToDelete && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                        <div className="bg-white border-2 border-red-200 p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-black">
                            {/* Warning Strip */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                            
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border-2 border-red-100">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                
                                <h2 className="text-2xl font-black text-k9-black uppercase mb-2 tracking-tighter">
                                    Confirmar Exclusão
                                </h2>
                                
                                <p className="text-gray-500 text-sm font-semibold mb-6 uppercase tracking-tight">
                                    Você está prestes a apagar a operação<br/>
                                    <span className="text-red-600 font-bold">"{roomToDelete.name.toUpperCase()}"</span><br/>
                                    Esta ação é permanente e irreversível.
                                </p>

                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => setRoomToDelete(null)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDeleteRoom}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-red-700 transition-all shadow-lg hover:shadow-red-500/20"
                                    >
                                        Excluir Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
