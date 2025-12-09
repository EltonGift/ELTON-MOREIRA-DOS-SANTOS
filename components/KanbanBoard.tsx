import React, { useState, useMemo } from 'react';
import type { CaseData, Status, Fase, Tribunal, User } from '../types';
import CaseDetailModal from './CaseDetailModal';

type GroupBy = 'status' | 'fases' | 'name' | 'coResponsibleName' | 'tribunal';

interface KanbanBoardProps {
    cases: CaseData[];
    statuses: Status[];
    fases: Fase[];
    tribunals: Tribunal[];
    users: User[];
    onUpdateCase: (updatedCase: CaseData) => void;
    groupBy: GroupBy;
    onAddAttachment: (caseId: number, file: File) => void;
    isAdminView: boolean;
}

const PriorityBadge: React.FC<{ priority: 'Alta' | 'Média' | 'Baixa' }> = ({ priority }) => {
    const colorClasses = {
        'Alta': 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
        'Média': 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
        'Baixa': 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20'
    };
    return (
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${colorClasses[priority]}`}>
            {priority}
        </span>
    );
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};


const KanbanCard: React.FC<{ caseData: CaseData; onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: number) => void; onClick: () => void }> = ({ caseData, onDragStart, onClick }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, caseData.id)}
            onClick={onClick}
            className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-indigo-700 break-all">{caseData.processoNumero}</p>
                <PriorityBadge priority={caseData.prioridade} />
            </div>
            <p className="text-sm font-medium text-gray-800 mb-2">{caseData.autor} vs {caseData.reu}</p>
            <div className="text-xs text-gray-500 space-y-1">
                <p><span className="font-medium">Co-responsável:</span> {caseData.coResponsibleName || 'N/D'}</p>
                <p><span className="font-medium">Atribuído a:</span> {caseData.name}</p>
                 <div className="flex items-center gap-1.5 pt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-medium">Prazo:</span> {formatDate(caseData.dataFinal)}
                 </div>
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ cases, statuses, fases, tribunals, users, onUpdateCase, groupBy, onAddAttachment, isAdminView }) => {
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
    
    const columns = useMemo(() => {
        switch (groupBy) {
            case 'status':
                return statuses.map(s => ({ id: s.name, name: s.name }));
            case 'fases':
                return fases.map(f => ({ id: f.name, name: f.name }));
            case 'tribunal':
                return tribunals.map(t => ({ id: t.name, name: t.name }));
            case 'name': {
                const assigneeNames = [...new Set(cases.map(c => c.name).filter((name): name is string => !!name && name !== 'Ms Tributário'))];
                return [{ id: 'N/D', name: 'Não atribuído' }, ...assigneeNames.sort((a: string, b: string) => a.localeCompare(b)).map(name => ({ id: name, name: name }))];
            }
             case 'coResponsibleName': {
                const coResponsibleNames = [...new Set(cases.map(c => c.coResponsibleName).filter((name): name is string => !!name))];
                return [{ id: 'N/D', name: 'Não atribuído' }, ...coResponsibleNames.sort((a: string, b: string) => a.localeCompare(b)).map(name => ({ id: name, name: name }))];
            }
            default:
                return [];
        }
    }, [groupBy, statuses, fases, tribunals, cases]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, caseId: number) => {
        e.dataTransfer.setData('caseId', caseId.toString());
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, statusName: string) => {
        e.preventDefault();
        setDraggedOverColumn(statusName);
    };
    
    const handleDragLeave = () => {
        setDraggedOverColumn(null);
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newColumnValue: string) => {
        e.preventDefault();
        setDraggedOverColumn(null); 

        const caseId = parseInt(e.dataTransfer.getData('caseId'), 10);
        const caseToUpdate = cases.find(c => c.id === caseId);

        if (!caseToUpdate) return;
        
        if (groupBy === 'name') {
            const currentAssignee = caseToUpdate.name;
            const isCurrentlyUnassigned = !currentAssignee || currentAssignee === 'Ms Tributário';

            if ((isCurrentlyUnassigned && newColumnValue === 'N/D') || (currentAssignee === newColumnValue)) {
                return;
            }
            
            const finalNewValue = newColumnValue === 'N/D' ? 'Ms Tributário' : newColumnValue;

            const newAssigneeUser = users.find(u => u.name === finalNewValue);

            const updatedCase = {
                ...caseToUpdate,
                name: finalNewValue,
                email: newAssigneeUser?.email || '',
            };
            onUpdateCase(updatedCase);
        } else {
            const currentValue = caseToUpdate[groupBy as keyof CaseData] || 'N/D';
            if (currentValue !== newColumnValue) {
                const updatedCase = {
                    ...caseToUpdate,
                    [groupBy]: newColumnValue === 'N/D' ? undefined : newColumnValue
                };
                onUpdateCase(updatedCase);
            }
        }
    };

    const handleCardClick = (caseData: CaseData) => {
        setSelectedCase(caseData);
        setDetailModalOpen(true);
    }

    return (
        <>
        <div className="flex space-x-4 overflow-x-auto pb-4 min-h-[75vh]">
            {columns.map(column => {
                const columnCases = cases.filter(c => {
                    if (groupBy === 'name') {
                        const caseAssignee = c.name;
                        const isUnassigned = !caseAssignee || caseAssignee === 'Ms Tributário';
                        if (column.id === 'N/D') {
                            return isUnassigned;
                        }
                        return caseAssignee === column.id;
                    }
                    return (c[groupBy as keyof CaseData] || 'N/D') === column.id;
                });

                return (
                <div
                    key={column.id}
                    onDragOver={(e) => handleDragOver(e, column.name)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column.name)}
                    className={`w-80 flex-shrink-0 bg-gray-100 rounded-xl p-3 transition-colors ${draggedOverColumn === column.name ? 'bg-indigo-50 border-2 border-dashed border-indigo-400' : ''}`}
                >
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-base font-semibold text-gray-700 truncate" title={column.name}>{column.name}</h3>
                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                            {columnCases.length}
                        </span>
                    </div>
                    <div className="h-full overflow-y-auto max-h-[calc(75vh-50px)] pr-1">
                        {columnCases.map(c => (
                                <KanbanCard
                                    key={c.id}
                                    caseData={c}
                                    onDragStart={handleDragStart}
                                    onClick={() => handleCardClick(c)}
                                />
                            ))}
                    </div>
                </div>
            )})}
        </div>
        {isDetailModalOpen && selectedCase && (
            <CaseDetailModal 
                caseData={selectedCase}
                onClose={() => setDetailModalOpen(false)}
                onAddAttachment={onAddAttachment}
                isAdminView={isAdminView}
            />
        )}
        </>
    );
};

export default KanbanBoard;