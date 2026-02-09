'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getTestTemplates } from '@/services/adminService';
import { TestTemplate } from '@/types/schema';
import { FileText, ClipboardCheck, Info } from 'lucide-react';

export default function TestsPage() {
    const [tests, setTests] = useState<TestTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getTestTemplates();
                setTests(data);
            } catch (e) {
                console.error("Error fetching tests", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-tactical-black text-gray-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <FileText className="w-8 h-8 text-police-gold" />
                        Catálogo de Provas
                    </h1>
                    <p className="text-gray-500 text-sm uppercase tracking-widest pl-11">Protocolos de Avaliação Disponíveis</p>
                </div>

                {loading ? (
                    <div className="text-center p-12 animate-pulse text-police-gold font-mono">[CARREGANDO DADOS...]</div>
                ) : (
                    <div className="space-y-6">
                        {tests.map(test => (
                            <div key={test.id} className="bg-tactical-gray border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-gray-600 transition-all">
                                <div className="p-6 border-b border-gray-800 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-white uppercase tracking-wide">{test.title}</h2>
                                        <p className="text-gray-500 text-sm mt-1">{test.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-police-gold/10 border border-police-gold/30 rounded text-police-gold font-bold text-sm uppercase tracking-wider">
                                        <ClipboardCheck className="w-4 h-4" />
                                        Max Pontos: {test.maxScore}
                                    </div>
                                </div>

                                <div className="p-6 grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Info className="w-3 h-3" /> Critérios de Avaliação
                                        </h3>
                                        <div className="space-y-2">
                                            {test.groups.map((group, idx) => (
                                                <div key={idx} className="bg-white/5 rounded p-3 text-sm border border-white/5">
                                                    <div className="font-bold text-gray-300 mb-2 border-b border-white/10 pb-1">{group.name}</div>
                                                    <ul className="space-y-1">
                                                        {group.items.map(item => (
                                                            <li key={item.id} className="flex justify-between text-gray-500 text-xs">
                                                                <span>• {item.label}</span>
                                                                <span className="text-gray-400 font-mono">{item.maxPoints} pts</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-alert-red uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Info className="w-3 h-3" /> Penalidades Táticas
                                        </h3>
                                        <div className="bg-red-900/10 border border-red-900/30 rounded p-3">
                                            <ul className="space-y-2">
                                                {test.penalties.map(p => (
                                                    <li key={p.id} className="flex justify-between text-xs text-red-300/80">
                                                        <span>{p.label}</span>
                                                        <span className="font-mono font-bold">{p.value}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {tests.length === 0 && (
                            <div className="text-center py-12 bg-white/5 rounded border border-dashed border-gray-700 text-gray-500">
                                NENHUMA PROVA CADASTRADA
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
