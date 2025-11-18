import React, { useMemo, useState } from 'react';
import type { CaseData, TramitationEntry } from '../types';

interface FlatTramitationLog extends TramitationEntry {
    processoNumero: string;
    caseId: number;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const TramitationHistory: React.FC<{ cases: CaseData[] }> = ({ cases }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof FlatTramitationLog | 'processoNumero'; direction: 'asc' | 'desc' } | null>(null);

    const flatHistory = useMemo((): FlatTramitationLog[] => {
        return cases.flatMap(caseItem => 
            (caseItem.tramitationLog || []).map(log => ({
                ...log,
                processoNumero: caseItem.processoNumero,
                caseId: caseItem.id,
            }))
        );
    }, [cases]);

    const requestSort = (key: keyof FlatTramitationLog | 'processoNumero') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredAndSortedHistory = useMemo(() => {
        let filteredLogs = [...flatHistory];

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredLogs = filteredLogs.filter(log =>
                log.processoNumero.toLowerCase().includes(lowercasedFilter) ||
                log.fromUser.toLowerCase().includes(lowercasedFilter) ||
                log.toUser.toLowerCase().includes(lowercasedFilter)
            );
        }

        if (sortConfig !== null) {
            filteredLogs.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else {
            // Default sort: newest first
            filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }

        return filteredLogs;
    }, [flatHistory, searchTerm, sortConfig]);

    const SortableHeader: React.FC<{ columnKey: keyof FlatTramitationLog | 'processoNumero'; title: string; }> = ({ columnKey, title }) => (
         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
            <button type="button" onClick={() => requestSort(columnKey)} className="flex items-center gap-1.5 w-full text-left font-medium text-gray-500 uppercase tracking-wider group focus:outline-none">
                <span>{title}</span>
                <span>{sortConfig?.key === columnKey ? (sortConfig.direction === 'asc' ? '▲' : '▼') : (<span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">↕</span>)}</span>
            </button>
        </th>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Histórico de Tramitação</h2>
                <div className="relative">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute text-gray-400 left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Buscar por processo ou usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                        aria-label="Buscar no histórico de tramitação"
                    />
                </div>
            </div>

            <div className="overflow-y-auto overflow-x-auto max-h-[75vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <SortableHeader columnKey="processoNumero" title="Processo Número" />
                            <SortableHeader columnKey="fromUser" title="De" />
                            <SortableHeader columnKey="toUser" title="Para" />
                            <SortableHeader columnKey="timestamp" title="Data da Tramitação" />
                            <SortableHeader columnKey="deadline" title="Prazo Final" />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedHistory.length > 0 ? (
                            filteredAndSortedHistory.map((log, index) => (
                                <tr key={`${log.caseId}-${index}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{log.processoNumero}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.fromUser}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.toUser}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateTime(log.timestamp)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(log.deadline)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    {searchTerm ? 'Nenhum registro encontrado para sua busca.' : 'Nenhuma tramitação registrada.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TramitationHistory;