'use client';

import { useState, useEffect } from 'react';
import { getRooms, getCompetitorsByRoom, getTestTemplates } from '@/services/adminService';
import { saveEvaluation } from '@/services/evaluationService';
import { Room, Competitor, TestTemplate } from '@/types/schema';
import { 
    Wifi, 
    RefreshCw, 
    MapPin, 
    User, 
    FileText, 
    AlertTriangle, 
    CheckCircle, 
    Save, 
    RotateCcw,
    Gavel,
    Search
} from 'lucide-react';

export default function JudgePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Lists
  const [rooms, setRooms] = useState<Room[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);

  // Selection
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TestTemplate | null>(null);

  // Evaluation Form State
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedPenalties, setSelectedPenalties] = useState<string[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);

  // 1. Load Rooms on Mount
  useEffect(() => {
    async function load() {
        // Mock admin ID for now or fetch all
        const data = await getRooms('test-admin-uid');
        setRooms(data);
    }
    load();
  }, []);

  // 2. Load Competitors & Templtes when Room Selected
  useEffect(() => {
    if (!selectedRoomId) return;
    async function load() {
        const comps = await getCompetitorsByRoom(selectedRoomId);
        setCompetitors(comps);
        const temps = await getTestTemplates(selectedRoomId); // and globals
        setTemplates(temps);
    }
    load();
  }, [selectedRoomId]);

  const handleScoreChange = (itemId: string, value: string) => {
    setScores(prev => ({
        ...prev,
        [itemId]: parseFloat(value) || 0
    }));
  };

  const togglePenalty = (penaltyId: string) => {
    setSelectedPenalties(prev => 
        prev.includes(penaltyId) 
            ? prev.filter(id => id !== penaltyId)
            : [...prev, penaltyId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !selectedCompetitorId) return;

    setLoading(true);
    try {
        const penaltiesApplied = selectedPenalties.map(pid => ({
            penaltyId: pid,
            value: selectedTemplate.penalties.find(p => p.id === pid)?.value || 0
        }));

        const id = await saveEvaluation({
            roomId: selectedRoomId,
            testId: selectedTemplate.id,
            competitorId: selectedCompetitorId,
            judgeId: 'test-judge-uid',
            scores,
            penaltiesApplied,
            notes: 'Evaluation from Verification UI'
        }, selectedTemplate);

        setEvaluationResult(`Avaliação salva com sucesso! ID: ${id}`);
        setStep(4); // Success step
    } catch (e: any) {
        alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-tactical-black p-8 text-gray-200">
        <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-4 flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Gavel className="text-police-gold w-8 h-8" />
                    Área de Avaliação
                </h1>
                <p className="text-police-gold text-sm uppercase tracking-widest pl-11">Juiz de Campo</p>
            </div>
            <div className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${loading ? 'bg-yellow-900/50 text-yellow-500' : 'bg-green-900/50 text-green-500'}`}>
                {loading ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Wifi className="w-3 h-3"/>}
                {loading ? 'SYNCING...' : 'ONLINE'}
            </div>
        </header>

        {/* STEP 1: Select Room */}
        {step === 1 && (
            <div className="bg-tactical-gray p-8 rounded-xl border border-gray-800 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-l-4 border-police-gold pl-4 flex items-center gap-3">
                    <MapPin className="text-police-gold w-6 h-6" />
                    1. Selecione a Operação
                </h2>
                {rooms.length === 0 ? <p className="text-gray-500">Nenhuma operação ativa encontrada.</p> : (
                    <div className="space-y-2">
                        {rooms.map(room => (
                            <button 
                                key={room.id}
                                onClick={() => { setSelectedRoomId(room.id); setStep(2); }}
                                className="w-full text-left p-6 bg-black/40 border border-gray-700 hover:border-police-gold hover:bg-white/5 rounded transition-all group"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg text-white group-hover:text-police-gold uppercase tracking-wider">{room.name}</span>
                                    <span className="text-xs font-mono text-gray-600 bg-black px-2 py-1 rounded border border-gray-800">ID: {room.id.substring(0,8)}...</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* STEP 2: Select Competitor & Template */}
        {step === 2 && (
            <div className="bg-tactical-gray p-8 rounded-xl border border-gray-800 shadow-2xl space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider border-l-4 border-police-gold pl-4 flex items-center gap-3">
                        <Search className="text-police-gold w-6 h-6" />
                        2. Configuração Tática
                    </h2>
                    <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Alterar Operação
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Selecione o Binômio
                        </label>
                        <select 
                            className="w-full bg-black/50 border border-gray-700 text-white rounded p-4 focus:outline-none focus:border-police-gold"
                            onChange={(e) => setSelectedCompetitorId(e.target.value)}
                            value={selectedCompetitorId}
                        >
                            <option value="">-- SELECIONAR --</option>
                            {competitors.map(c => (
                                <option key={c.id} value={c.id}>
                                    #{c.competitorNumber} | {c.handlerName} & {c.dogName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-police-gold mb-2 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Protocolo de Prova
                        </label>
                        <select 
                            className="w-full bg-black/50 border border-gray-700 text-white rounded p-4 focus:outline-none focus:border-police-gold"
                            onChange={(e) => {
                                const t = templates.find(temp => temp.id === e.target.value);
                                setSelectedTemplate(t || null);
                            }}
                            value={selectedTemplate?.id || ''}
                        >
                            <option value="">-- SELECIONAR --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-800 flex justify-end">
                    <button 
                        disabled={!selectedCompetitorId || !selectedTemplate}
                        onClick={() => setStep(3)}
                        className="bg-police-dark-gold hover:bg-police-gold text-black px-8 py-4 rounded font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                    >
                        INICIAR AVALIAÇÃO
                    </button>
                </div>
            </div>
        )}

        {/* STEP 3: Evaluation Form */}
        {step === 3 && selectedTemplate && (
            <div className="space-y-8">
               <div className="bg-white text-black p-8 rounded shadow-2xl border-t-8 border-police-gold">
                    <div className="mb-6 flex justify-between items-start border-b pb-4 border-gray-200">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-black">{selectedTemplate.title}</h2>
                            <p className="text-gray-500 uppercase tracking-widest text-sm">{selectedTemplate.description}</p>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-gray-400 uppercase">Juiz ID</div>
                             <div className="font-mono font-bold">JUDGE-01</div>
                        </div>
                    </div>
                    
                    {/* Score Groups */}
                    <div className="space-y-8">
                        {selectedTemplate.groups.map(group => (
                            <div key={group.name} className="">
                                <h3 className="text-lg font-bold text-white bg-black p-3 uppercase tracking-wider mb-4 inline-block transform -skew-x-12">{group.name}</h3>
                                <div className="space-y-4 px-2">
                                    {group.items.map(item => (
                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b border-gray-100 pb-4 last:border-0 hover:bg-gray-50 p-2 transition-colors">
                                            <div className="md:col-span-3">
                                                <div className="font-bold text-lg text-gray-800">{item.label}</div>
                                                <div className="text-sm text-gray-500">{item.description}</div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2">
                                                <input 
                                                    type="number" 
                                                    step="0.1"
                                                    min="0"
                                                    max={item.maxPoints}
                                                    className="w-24 p-3 border-2 border-gray-300 rounded text-right font-mono text-xl focus:border-black focus:ring-0 text-black font-bold"
                                                    placeholder="0.0"
                                                    onChange={(e) => handleScoreChange(item.id, e.target.value)}
                                                />
                                                <span className="text-sm font-bold text-gray-400 w-12"> / {item.maxPoints}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Penalties */}
                    <div className="mt-10 bg-red-50 p-6 rounded border border-red-100">
                        <h3 className="text-lg font-bold text-alert-red mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <AlertTriangle className="w-6 h-6" />
                            Penalidades / Faltas Graves
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedTemplate.penalties.map(penalty => (
                                <label key={penalty.id} className={`flex items-center gap-4 p-4 border-2 rounded cursor-pointer transition-all ${selectedPenalties.includes(penalty.id) ? 'bg-red-100 border-red-500 shadow-md transform scale-[1.01]' : 'bg-white border-transparent hover:border-gray-200'}`}>
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${selectedPenalties.includes(penalty.id) ? 'border-red-600 bg-red-600' : 'border-gray-300'}`}>
                                        {selectedPenalties.includes(penalty.id) && <span className="text-white font-bold text-xs">✓</span>}
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={selectedPenalties.includes(penalty.id)}
                                        onChange={() => togglePenalty(penalty.id)}
                                        className="hidden"
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{penalty.label}</div>
                                        <div className="text-sm font-bold text-red-600">{penalty.value} pts</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 flex justify-end gap-4 border-t pt-8">
                         <button onClick={() => setStep(2)} className="text-gray-500 px-6 py-4 font-bold uppercase hover:text-black flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" />
                            Cancelar
                        </button>
                         <button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className="bg-black text-police-gold px-12 py-4 rounded font-black text-xl hover:bg-gray-900 shadow-xl uppercase tracking-widest transform hover:-translate-y-1 transition-all flex items-center gap-3"
                        >
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin"/> : <Save className="w-6 h-6"/>}
                            {loading ? 'Calculando...' : 'FINALIZAR PROVA'}
                        </button>
                    </div>
               </div>
            </div>
        )}

        {step === 4 && (
            <div className="bg-tactical-gray p-12 rounded-xl shadow-2xl text-center border border-gray-700">
                <div className="mb-6 flex justify-center">
                    <CheckCircle className="w-24 h-24 text-green-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Avaliação Registrada</h2>
                <p className="text-gray-400 mb-8">Os dados foram sincronizados com o comando central.</p>
                
                <div className="bg-black p-6 rounded border border-gray-800 text-left mb-8 max-w-lg mx-auto overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-police-gold"></div>
                    <code className="text-sm font-mono text-police-gold block break-all">
                        {evaluationResult}
                    </code>
                </div>

                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => { setStep(1); setEvaluationResult(null); setScores({}); setSelectedPenalties([]); }}
                        className="bg-police-gold text-black px-8 py-3 rounded font-bold uppercase tracking-wider hover:bg-white transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Nova Avaliação
                    </button>
                </div>
            </div>
        )}
        </div>
    </div>
  );
}
