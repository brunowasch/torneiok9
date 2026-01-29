'use client';

import { useState } from 'react';
import { createRoom, createTestTemplate, addCompetitor } from '@/services/adminService';
import { 
    MapPin, 
    Users, 
    FileText, 
    Info, 
    PlusCircle, 
    UserPlus, 
    Wand2, 
    ShieldAlert 
} from 'lucide-react';
import { ScoreGroup, PenaltyOption } from '@/types/schema';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('room');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ... (rest of the state logic is unchanged) ...

  // Keep logic... just replacing UI in return

  // Room State
  const [roomName, setRoomName] = useState('');
  
  // Competitor State
  const [roomIdForCompetitor, setRoomIdForCompetitor] = useState('');
  const [handlerName, setHandlerName] = useState('');
  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');

  // Template State
  const [roomIdForTemplate, setRoomIdForTemplate] = useState('');

  const createProtecaoTemplate = async () => {
    if (!roomIdForTemplate) {
        setMessage('Erro: Informe o ID da Sala para o Template');
        return;
    }

    setLoading(true);
    try {
        const groups: ScoreGroup[] = [
            {
              name: "Parte A: Avaliação da Condutora",
              items: [
                { id: "a1", label: "Leitura de Cenário e Antecipação", maxPoints: 2.0, description: "Percebeu a ameaça?" },
                { id: "a2", label: "Posicionamento Tático", maxPoints: 1.5, description: "Usou o cão como barreira?" },
                { id: "a3", label: "Comando e Controle", maxPoints: 1.5, description: "Comandos claros?" }
              ]
            },
            {
              name: "Parte B: Avaliação do Cão",
              items: [
                { id: "b1", label: "Mudança de Estado e Foco", maxPoints: 1.5, description: "Reação rápida?" },
                { id: "b2", label: "Intensidade da Dissuasão", maxPoints: 1.5, description: "Latido forte?" },
                { id: "b3", label: "CONTROLE DE IMPULSOS", maxPoints: 2.0, description: "Não mordeu?" }
              ]
            }
        ];

        const penalties: PenaltyOption[] = [
            { id: "p1", label: "Comando de ataque indevido", value: -5.0 },
            { id: "p2", label: "Cão morde sem comando", value: -4.0 },
            { id: "p3", label: "Cão recua/medo", value: -3.0 },
            { id: "p4", label: "Perda de controle físico", value: -2.0 },
            { id: "p5", label: "Latido fraco", value: -1.0 }
        ];

        const id = await createTestTemplate({
            title: "Prova de Proteção 1",
            description: "Categoria Feminina (Condutoras)",
            maxScore: 10.0,
            groups,
            penalties,
            roomId: roomIdForTemplate
        });
        setMessage(`Template criado com ID: ${id}`);
    } catch (e: any) {
        setMessage(`Erro: ${e.message}`);
    }
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
        const id = await createRoom({
            name: roomName,
            description: "Torneio Teste",
            active: true,
            judges: [],
            createdBy: 'test-admin-uid'
        });
        setMessage(`Sala criada com ID: ${id}`);
        setRoomIdForCompetitor(id); // Auto-fill for convenience
    } catch (e: any) {
        setMessage(`Erro: ${e.message}`);
    }
    setLoading(false);
  };

  const handleAddCompetitor = async () => {
    setLoading(true);
    try {
        const id = await addCompetitor({
            roomId: roomIdForCompetitor,
            handlerName,
            dogName,
            dogBreed,
            competitorNumber: Math.floor(Math.random() * 100),
        });
        setMessage(`Competidor adicionado com ID: ${id}`);
    } catch (e: any) {
        setMessage(`Erro: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-tactical-black p-8 text-gray-200">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-4 flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <ShieldAlert className="text-police-gold w-8 h-8" />
                    Painel de Controle
                </h1>
                <p className="text-police-gold text-sm uppercase tracking-widest pl-11">Administração do Torneio</p>
            </div>
            <div className="text-xs text-gray-500 font-mono">SECURE CONNECTION</div>
        </header>
      
      {message && (
        <div className="p-4 mb-6 bg-green-900/20 border border-green-700 text-green-400 rounded-sm font-mono text-sm flex items-center gap-2">
            <Info className="w-5 h-5" />
            <span>[SYSTEM_MSG]: {message}</span>
        </div>
      )}

      <div className="flex gap-2 mb-8 bg-tactical-gray p-1 rounded-lg border border-gray-800">
        <button 
            onClick={() => setActiveTab('room')}
            className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-md flex items-center justify-center gap-2 ${activeTab === 'room' ? 'bg-police-gold text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
        >
            <MapPin className="w-4 h-4" />
            1. Criar Sala
        </button>
        <button 
            onClick={() => setActiveTab('competitor')}
            className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-md flex items-center justify-center gap-2 ${activeTab === 'competitor' ? 'bg-police-gold text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
        >
            <Users className="w-4 h-4" />
            2. Competidores
        </button>
        <button 
            onClick={() => setActiveTab('template')}
            className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-md flex items-center justify-center gap-2 ${activeTab === 'template' ? 'bg-police-gold text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
        >
            <FileText className="w-4 h-4" />
            3. Templates
        </button>
      </div>

      <div className="bg-tactical-gray p-8 rounded-xl border border-gray-800 shadow-2xl relative overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none"></div>

        {activeTab === 'room' && (
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1 uppercase flex items-center gap-2">
                        <PlusCircle className="text-police-gold w-5 h-5" />
                        Nova Sala de Torneio
                    </h2>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Inicie um novo evento</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider">Nome da Sala</label>
                    <input 
                        type="text" 
                        value={roomName} 
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 text-white rounded p-3 focus:outline-none focus:border-police-gold focus:ring-1 focus:ring-police-gold transition-all"
                        placeholder="EX: 5º TORNEIO INTERNACIONAL..."
                    />
                </div>
                <button 
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="w-full bg-police-dark-gold hover:bg-police-gold text-black font-black uppercase py-4 rounded tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <PlusCircle className="w-5 h-5" />
                    {loading ? 'PROCESSANDO...' : 'CRIAR OPERAÇÃO'}
                </button>
            </div>
        )}

        {activeTab === 'competitor' && (
            <div className="space-y-6">
                 <div>
                    <h2 className="text-xl font-bold text-white mb-1 uppercase flex items-center gap-2">
                        <UserPlus className="text-police-gold w-5 h-5" />
                        Cadastro de Binômio
                    </h2>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Inserir dados do competidor</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider">ID da Sala (Hash)</label>
                    <input 
                        type="text" 
                        value={roomIdForCompetitor} 
                        onChange={(e) => setRoomIdForCompetitor(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 text-white rounded p-3 font-mono text-sm focus:outline-none focus:border-police-gold"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider">Condutor(a)</label>
                    <input 
                        type="text" 
                        value={handlerName} 
                        onChange={(e) => setHandlerName(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 text-white rounded p-3 focus:outline-none focus:border-police-gold"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider">Nome do Cão</label>
                        <input 
                            type="text" 
                            value={dogName} 
                            onChange={(e) => setDogName(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 text-white rounded p-3 focus:outline-none focus:border-police-gold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider">Raça</label>
                        <input 
                            type="text" 
                            value={dogBreed} 
                            onChange={(e) => setDogBreed(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 text-white rounded p-3 focus:outline-none focus:border-police-gold"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleAddCompetitor}
                    disabled={loading}
                    className="w-full bg-green-800 hover:bg-green-700 text-white border border-green-600 font-black uppercase py-4 rounded tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                     <UserPlus className="w-5 h-5" />
                    {loading ? 'SALVANDO DADOS...' : 'REGISTRAR BINÔMIO'}
                </button>
            </div>
        )}

        {activeTab === 'template' && (
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1 uppercase flex items-center gap-2">
                        <FileText className="text-police-gold w-5 h-5" />
                        Protocolo de Prova
                    </h2>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Gerar template padrão (Proteção 1)</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider">ID da Sala Alvo</label>
                    <input 
                        type="text" 
                        value={roomIdForTemplate} 
                        onChange={(e) => setRoomIdForTemplate(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 text-white rounded p-3 font-mono text-sm focus:outline-none focus:border-police-gold"
                        placeholder="Cole o ID da sala aqui"
                    />
                </div>
                <div className="p-4 bg-black/30 border border-gray-700 rounded text-sm text-gray-400 flex items-start gap-3">
                    <Info className="w-5 h-5 text-police-gold shrink-0 mt-0.5" />
                    <div>
                        <p>Esta ação carregará automaticamente os parâmetros de:</p>
                        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
                            <li>Parte A: Avaliação da Condutora</li>
                            <li>Parte B: Avaliação do Cão</li>
                            <li>Penalidades Táticas</li>
                        </ul>
                    </div>
                </div>
                <button 
                    onClick={createProtecaoTemplate}
                    disabled={loading}
                    className="w-full bg-purple-900/50 hover:bg-purple-900 text-purple-200 border border-purple-700 font-bold uppercase py-4 rounded tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                     <Wand2 className="w-5 h-5" />
                    {loading ? 'GERANDO PROTOCOLO...' : 'GERAR TEMPLATE PADRÃO'}
                </button>
            </div>
        )}
      </div>
      </div>
    </div>
  );
}
