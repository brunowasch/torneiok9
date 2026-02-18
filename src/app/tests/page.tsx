'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getTestTemplates, getModalities } from '@/services/adminService';
import { TestTemplate } from '@/types/schema';
import { FileText, ClipboardCheck, Info } from 'lucide-react';

export default function TestsPage() {
    const [tests, setTests] = useState<TestTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [allTests, mods] = await Promise.all([
                    getTestTemplates(),
                    getModalities()
                ]);
                const validModalityNames = mods.map(m => m.name);
                const validTests = allTests.filter(t => validModalityNames.includes(t.modality as string));
                setTests(validTests);
            } catch (e) {
                console.error("Error fetching tests", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3">
                        <FileText className="w-8 h-8 text-k9-orange" />
                        Catálogo de Provas
                    </h1>
                    <p className="text-gray-500 text-sm uppercase tracking-widest pl-11">Protocolos de Avaliação Disponíveis</p>
                </div>

                {loading ? (
                    <div className="text-center p-12 animate-pulse text-k9-orange font-mono">[CARREGANDO DADOS...]</div>
                ) : (
                    <div className="space-y-6">
                        {tests.map(test => (
                            <div key={test.id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:border-k9-orange transition-all">
                                <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-k9-black uppercase tracking-wide">{test.title}</h2>
                                        <p className="text-gray-600 text-sm mt-1">{test.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-k9-orange/10 border-2 border-k9-orange rounded-lg text-k9-orange font-bold text-sm uppercase tracking-wider whitespace-nowrap">
                                        <ClipboardCheck className="w-4 h-4" />
                                        Max Pontos: {test.maxScore}
                                    </div>
                                </div>

                                <div className="p-6 grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xs font-black text-k9-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b-2 border-k9-orange pb-2">
                                            <Info className="w-4 h-4 text-k9-orange" /> Critérios de Avaliação
                                        </h3>
                                        <div className="space-y-2">
                                            {test.groups.map((group, idx) => (
                                                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                                                    <div className="font-bold text-k9-black mb-2 border-b border-gray-300 pb-1">{group.name}</div>
                                                    <ul className="space-y-1">
                                                        {group.items.map(item => (
                                                            <li key={item.id} className="flex justify-between text-gray-600 text-xs">
                                                                <span>• {item.label}</span>
                                                                <span className="text-gray-800 font-mono font-bold">{item.maxPoints} pts</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b-2 border-red-600 pb-2">
                                            <Info className="w-4 h-4" /> Penalidades Táticas
                                        </h3>
                                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                            <ul className="space-y-2">
                                                {test.penalties.map(p => (
                                                    <li key={p.id} className="flex justify-between text-xs text-red-700 font-semibold">
                                                        <span>{p.label}</span>
                                                        <span className="font-mono">{p.value}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {tests.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 font-mono">
                                NENHUMA PROVA CADASTRADA
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
