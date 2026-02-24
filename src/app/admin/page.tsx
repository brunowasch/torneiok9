'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRoom, getRooms, deleteRoom } from '@/services/adminService';
import { getAllPendingEditRequests, respondToEditScoreRequest } from '@/services/evaluationService';
import { auth } from '@/lib/firebase';
import {
    PlusCircle,
    ShieldAlert,
    ChevronRight,
    MapPin,
    Calendar,
    Users,
    LogOut,
    Trash2,
    Shield,
    Eye,
    EyeOff,
    Bell,
    Send,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import { Room, EditScoreRequest } from '@/types/schema';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AdminDashboard() {
    const router = useRouter();
    const { t } = useTranslation();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [pendingRequests, setPendingRequests] = useState<EditScoreRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [user, setUser] = useState<User | null>(null);

    const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    const [roomToDelete, setRoomToDelete] = useState<{ id: string, name: string } | null>(null);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [requestFilterRoomId, setRequestFilterRoomId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchRooms();
            } else {
                console.log("No user logged in in Admin Dashboard");
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchRooms = async () => {
        try {
            const [roomsData, requestsData] = await Promise.all([
                getRooms(),
                getAllPendingEditRequests()
            ]);
            setRooms(roomsData);
            setPendingRequests(requestsData);
        } catch (e) {
            console.error("Error loading dashboard data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/secret-access');
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
            fetchRooms();
        } catch (err) {
            console.error('Error creating room', err);
            alert(t('adminDashboard.errorCreateRoom'));
        }
    };

    const handleCreateAdmin = async () => {
        if (!newAdmin.email || !newAdmin.password || !newAdmin.name) return;
        try {
            const { createNewAdminByAdmin } = await import('@/services/userService');
            await createNewAdminByAdmin(newAdmin.email, newAdmin.password, newAdmin.name);
            alert(t('adminDashboard.successCreateAdmin'));
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
            fetchRooms();
        } catch (err) {
            console.error('Error deleting room', err);
            alert(t('adminDashboard.errorDeleteRoom'));
        }
    };

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-k9-white flex items-center justify-center p-4 text-k9-black">
                <div className="text-center">
                    <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold uppercase">{t('adminDashboard.restrictedAccess')}</h1>
                    <p className="text-gray-500 text-sm mt-2">{t('adminDashboard.loginRequired')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-k9-white p-4 md:p-8 text-k9-black font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 bg-black border-b-4 border-k9-orange p-6 py-8 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between text-white -mt-6 relative">
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-k9-orange/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>
                    <div className="relative z-10 flex items-center gap-5">
                        <div className="h-16 w-16 relative flex items-center justify-center p-1 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                                {t('adminDashboard.title')}
                            </h1>
                            <p className="text-k9-orange text-[10px] uppercase tracking-[0.2em] font-black opacity-80">{t('adminDashboard.subtitle')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-6 md:mt-0 relative z-20">
                        <LanguageSwitcher />
                        <div className="h-8 w-px bg-white/10 mx-1 hidden md:block"></div>
                        <button
                            onClick={handleLogout}
                            className="text-white hover:text-red-400 text-xs font-black uppercase flex items-center gap-2 transition-all border-b-2 border-red-900 bg-red-600/10 hover:bg-red-600/20 px-4 py-2.5 rounded-lg shadow-sm"
                        >
                            <LogOut className="w-4 h-4" /> {t('adminDashboard.logout')}
                        </button>
                    </div>
                </header>

                <div className="flex justify-end gap-4 mb-8">
                    <button
                        onClick={() => router.push('/admin/modalities')}
                        className="bg-white hover:bg-orange-50 text-k9-black font-bold uppercase px-4 py-3 rounded-lg tracking-widest transition-all flex items-center gap-2 text-xs cursor-pointer border-2 border-gray-200 shadow-sm hover:border-k9-orange"
                    >
                        <Shield className="w-4 h-4 text-k9-orange" />
                        {t('adminDashboard.modalities')}
                    </button>
                    <button
                        onClick={() => setShowCreateAdminModal(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-white font-bold uppercase px-4 py-3 rounded-lg tracking-widest transition-all flex items-center gap-2 text-xs cursor-pointer border border-gray-700 shadow-sm hover:border-k9-orange"
                    >
                        <Users className="w-4 h-4 text-k9-orange" />
                        {t('adminDashboard.newAdmin')}
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-lg flex items-center gap-2 hover:scale-105 bg-k9-orange text-black border-k9-orange hover:bg-orange-500 hover:border-orange-500 hover:text-white"
                    >
                        <PlusCircle className="w-5 h-5" />
                        {t('adminDashboard.newRoom')}
                    </button>
                </div>

                {/* Global Notification Banner */}
                {pendingRequests.length > 0 && (
                    <div 
                        onClick={() => {
                            setRequestFilterRoomId(null);
                            setShowRequestsModal(true);
                        }}
                        className="mb-8 bg-linear-to-r from-amber-500 to-orange-600 rounded-xl p-4 shadow-lg border-2 border-orange-400 animate-in fade-in slide-in-from-top-4 duration-500 cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-tight">Solicitações de Edição Pendentes</p>
                                    <p className="text-[10px] opacity-90 font-bold uppercase">Existem {pendingRequests.length} solicitações aguardando sua revisão nos torneios ativos. Clique para gerenciar.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-[10px] font-black uppercase border border-white/20">
                                    {pendingRequests.length} PENDENTES
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center p-12 animate-pulse text-k9-orange font-mono">{t('adminDashboard.loading')}</div>
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
                                                {pendingRequests.filter(r => r.roomId === room.id).length > 0 && (
                                                    <div
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setRequestFilterRoomId(room.id);
                                                            setShowRequestsModal(true);
                                                        }}
                                                        className="px-2 py-1 bg-red-500 text-white text-[9px] font-black rounded-lg flex items-center gap-1 shadow-md animate-pulse border-2 border-red-400 cursor-pointer hover:scale-110 transition-transform"
                                                        title={`${pendingRequests.filter(r => r.roomId === room.id).length} solicitações de edição`}
                                                    >
                                                        <Send className="w-3 h-3" />
                                                        {pendingRequests.filter(r => r.roomId === room.id).length}
                                                    </div>
                                                )}
                                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border-2 ${room.active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                                                    {room.active ? t('adminDashboard.inProgress') : t('adminDashboard.finished')}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteRoom(room.id, room.name);
                                                    }}
                                                    className="p-1.5 text-black hover:text-red-500 border-2 border-black hover:border-red-500 rounded-lg transition-all cursor-pointer z-10 bg-white shadow-sm"
                                                    title={t('adminDashboard.deleteRoomTitle')}
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
                                                {t('adminDashboard.manage')} <ChevronRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}

                        {rooms.length === 0 && (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                <p className="text-gray-600 uppercase font-bold tracking-widest mb-4">{t('adminDashboard.noRooms')}</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-k9-orange hover:text-k9-black underline uppercase text-xs tracking-wider font-bold transition-colors"
                                >
                                    {t('adminDashboard.createFirst')}
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
                                <PlusCircle className="text-k9-orange w-5 h-5" /> {t('adminDashboard.createRoomTitle')}
                            </h2>
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 rounded-lg mb-6 focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange uppercase font-semibold placeholder-gray-400"
                                placeholder={t('adminDashboard.roomNamePlaceholder')}
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-lg tracking-wider cursor-pointer border-2 border-gray-300 transition-all"
                                >
                                    {t('adminDashboard.cancelRoom')}
                                </button>
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={!newRoomName}
                                    className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-orange-400 text-white border-orange-400 hover:scale-105"
                                >
                                    {t('adminDashboard.confirmRoom')}
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
                                <Users className="text-k9-orange w-5 h-5" /> {t('adminDashboard.createAdminTitle')}
                            </h2>
                            <div className="space-y-4 mb-6">
                                <input
                                    type="text"
                                    value={newAdmin.name}
                                    required
                                    placeholder={t('adminDashboard.adminNamePlaceholder')}
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
                                <div className="relative">
                                    <input
                                        type={showAdminPassword ? "text" : "password"}
                                        value={newAdmin.password}
                                        required
                                        placeholder={t('adminDashboard.adminPasswordPlaceholder')}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-gray-300 text-k9-black p-3 pr-10 rounded-lg focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange font-semibold"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-k9-orange cursor-pointer"
                                    >
                                        {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCreateAdminModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-lg tracking-wider cursor-pointer border-2 border-gray-300 transition-all"
                                >
                                    {t('adminDashboard.cancelAdmin')}
                                </button>
                                <button
                                    onClick={handleCreateAdmin}
                                    disabled={!newAdmin.name || !newAdmin.email || !newAdmin.password}
                                    className="flex-1 px-6 py-3 text-sm font-black uppercase tracking-wider rounded-lg border-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-orange-400 text-white border-orange-400 hover:scale-105"
                                >
                                    {t('adminDashboard.confirmAdmin')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {roomToDelete && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                        <div className="bg-white border-2 border-red-200 p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden text-black text-center">
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 mt-2 border-2 border-red-100">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black uppercase mb-2 tracking-tighter">Excluir Sala</h2>
                            <p className="text-gray-500 text-sm font-semibold mb-6 uppercase">
                                Você tem certeza que deseja excluir a sala <span className="text-red-600">"{roomToDelete.name.toUpperCase()}"</span>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setRoomToDelete(null)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteRoom}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-red-700 shadow-lg"
                                >
                                    Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Requests Modal */}
                {showRequestsModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                        <div className="bg-white border-2 border-amber-200 p-8 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
                            
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm">
                                        <Send className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-k9-black uppercase tracking-tighter">Solicitações de Edição</h2>
                                        <p className="text-[10px] font-bold text-amber-600 uppercase">
                                            {requestFilterRoomId 
                                                ? `Torneio: ${rooms.find(r => r.id === requestFilterRoomId)?.name}` 
                                                : "Todos os torneios"}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowRequestsModal(false)}
                                    className="p-2 text-gray-400 hover:text-black transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="overflow-y-auto space-y-4 pr-2">
                                {pendingRequests
                                    .filter(r => !requestFilterRoomId || r.roomId === requestFilterRoomId)
                                    .map(req => {
                                        const room = rooms.find(rm => rm.id === req.roomId);
                                        return (
                                            <div key={req.id} className="bg-amber-50/50 rounded-xl border border-amber-100 p-4 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded uppercase">
                                                                {room?.name}
                                                            </span>
                                                        </div>
                                                        <div className="font-black text-k9-black uppercase text-sm truncate">
                                                            {req.competitorName || 'Competidor'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase">
                                                            Prova: {req.testTitle || 'Prova'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Juiz: {req.judgeName}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-amber-100 shadow-inner">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Motivo:</span>
                                                            {req.reason}
                                                        </div>
                                                        <div className="text-[9px] text-gray-300 font-mono mt-2">
                                                            {new Date(req.createdAt).toLocaleString('pt-BR')}
                                                        </div>
                                                    </div>
                                                    <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await respondToEditScoreRequest(req.id, 'approved', user?.uid || 'admin');
                                                                    fetchRooms();
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert('Erro ao aprovar.');
                                                                }
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase rounded-lg bg-green-500 text-white border border-green-600 hover:bg-green-600 transition-all cursor-pointer shadow-sm"
                                                        >
                                                            <CheckCircle className="w-4 h-4" /> Aprovar
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await respondToEditScoreRequest(req.id, 'rejected', user?.uid || 'admin');
                                                                    fetchRooms();
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert('Erro ao rejeitar.');
                                                                }
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all cursor-pointer shadow-sm"
                                                        >
                                                            <XCircle className="w-4 h-4" /> Rejeitar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                
                                {pendingRequests.filter(r => !requestFilterRoomId || r.roomId === requestFilterRoomId).length === 0 && (
                                    <div className="text-center py-8 text-gray-400 uppercase font-black text-xs tracking-widest">
                                        Nenhuma solicitação pendente encontrada.
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowRequestsModal(false)}
                                className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-k9-black font-bold uppercase text-xs rounded-xl tracking-wider cursor-pointer border-2 border-gray-200 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
