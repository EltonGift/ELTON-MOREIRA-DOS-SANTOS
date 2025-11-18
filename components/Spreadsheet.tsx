import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { read, utils, writeFile } from 'xlsx';
import { COLUMN_HEADERS, HEADER_KEY_MAP } from '../constants';
import type { CaseData, User, Tribunal, Fase, Status, TramitationEntry, Attachment } from '../types';

interface SpreadsheetProps {
    cases: CaseData[];
    onAddCase: (newCase: Omit<CaseData, 'id' | 'id2'>) => void;
    onUpdateCase: (updatedCase: CaseData) => void;
    onUpdateMultipleCases: (updatedCases: CaseData[]) => void;
    onDeleteCase: (caseId: number) => void;
    onDeleteMultipleCases: (caseIds: number[]) => void;
    onImportCases: (newCases: Omit<CaseData, 'id' | 'id2'>[]) => void;
    onTramitateCase: (caseId: number, toUserName: string, deadline: string, attachmentFile?: File) => void;
    isAdminView: boolean;
    users: User[];
    tribunals: Tribunal[];
    fases: Fase[];
    statuses: Status[];
}

type DeadlineStatus = 'overdue' | 'due-soon' | 'on-track' | 'completed' | 'none';

const getDeadlineStatus = (dateString: string, status: string): DeadlineStatus => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('concluído') || lowerStatus.includes('finalizado') || lowerStatus.includes('transitado em julgado') || lowerStatus.includes('arquivado')) {
        return 'completed';
    }
    if (!dateString) return 'none';
    
    // Adjust for different date formats from excel/manual input
    const parts = dateString.split(/[-/]/);
    let deadline: Date;
    if (parts.length === 3) {
        // Assuming YYYY-MM-DD or DD/MM/YYYY
        if (parts[0].length === 4) { // YYYY-MM-DD
            deadline = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else { // DD/MM/YYYY
             deadline = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    } else {
        deadline = new Date(dateString);
    }
    
    const today = new Date();
    // Reset time part for accurate day comparison
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(deadline.getTime())) return 'none';

    if (deadline < today) return 'overdue';

    const timeDiff = deadline.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff <= 7) return 'due-soon';
    
    return 'on-track';
};

const DeadlineStatusIndicator: React.FC<{ status: DeadlineStatus; deadline: string }> = ({ status, deadline }) => {
    const statusConfig = {
        overdue: { color: 'bg-red-500', text: 'Vencido' },
        'due-soon': { color: 'bg-yellow-500', text: 'Vencimento Próximo' },
        'on-track': { color: 'bg-green-500', text: 'Em dia' },
        completed: { color: 'bg-gray-400', text: 'Concluído' },
        none: { color: 'bg-gray-200', text: 'Sem prazo definido' },
    };

    const { color, text } = statusConfig[status];

    const getTitle = () => {
        if (status === 'none' || status === 'completed') return text;
        if (!deadline) return text;
         const deadlineDate = new Date(deadline);
         if(isNaN(deadlineDate.getTime())) return text;

        const today = new Date();
        deadlineDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

        if (daysDiff < 0) return `Vencido há ${Math.abs(daysDiff)} dia(s)`;
        if (daysDiff === 0) return 'Vence hoje';
        return `Vence em ${daysDiff} dia(s)`;
    };

    return <span className={`block w-3 h-3 rounded-full mx-auto ${color}`} title={getTitle()} />;
};


const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    // Add time zone offset to prevent date from changing
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return adjustedDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};


const PriorityBadge: React.FC<{ priority: 'Alta' | 'Média' | 'Baixa' }> = ({ priority }) => {
    const colorClasses = {
        'Alta': 'bg-red-100 text-red-800',
        'Média': 'bg-yellow-100 text-yellow-800',
        'Baixa': 'bg-green-100 text-green-800'
    };
    return (
        <span className={`px-2 py-1 text-[9px] font-semibold rounded-full ${colorClasses[priority]}`}>
            {priority}
        </span>
    );
};

const Spreadsheet: React.FC<SpreadsheetProps> = ({ cases, onAddCase, onUpdateCase, onUpdateMultipleCases, onDeleteCase, onDeleteMultipleCases, onImportCases, onTramitateCase, isAdminView, users, tribunals, fases, statuses }) => {
    const [isCaseModalOpen, setCaseModalOpen] = useState(false);
    const [isPasteModalOpen, setPasteModalOpen] = useState(false);
    const [isTramitationModalOpen, setTramitationModalOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<CaseData | null>(null);
    const [tramitatingCase, setTramitatingCase] = useState<CaseData | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof CaseData | 'tramitadoPara'; direction: 'asc' | 'desc' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [confirmModalState, setConfirmModalState] = useState<{isOpen: boolean; title: string; onConfirm: () => void; children: React.ReactNode}>({isOpen: false, title: '', onConfirm: () => {}, children: null});

    const [editingCell, setEditingCell] = useState<{ rowId: number; columnKey: keyof CaseData } | null>(null);
    const [editValue, setEditValue] = useState<string | number>('');

    const [selectedCaseIds, setSelectedCaseIds] = useState<Set<number>>(new Set());
    const [isMenuOpen, setMenuOpen] = useState(false);
    
    // Multi-edit state
    const [isMultiEditMode, setIsMultiEditMode] = useState(false);
    const [draftCases, setDraftCases] = useState<CaseData[]>([]);
    const [modifiedCaseIds, setModifiedCaseIds] = useState<Set<number>>(new Set());

    // Column resizing logic
    const [columnWidths, setColumnWidths] = useState<Partial<Record<keyof CaseData, number>>>({});
    const resizingColumnRef = useRef<{ key: keyof CaseData | 'tramitadoPara'; startX: number; startWidth: number } | null>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingColumnRef.current) return;
        const { key, startX, startWidth } = resizingColumnRef.current;
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth > 50) { // Minimum column width
            setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        resizingColumnRef.current = null;
    }, [handleMouseMove]);

    const handleMouseDown = (key: keyof CaseData | 'tramitadoPara') => (e: React.MouseEvent) => {
        e.preventDefault();
        const thElement = (e.target as HTMLElement).closest('th');
        if (thElement) {
            resizingColumnRef.current = {
                key,
                startX: e.clientX,
                startWidth: thElement.offsetWidth,
            };
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    const handleEditSave = (row: CaseData) => {
        if (!editingCell) return;
        
        let valueToSave = editValue;
        if(editingCell.columnKey === 'name'){
            const selectedUser = users.find(u => u.name === editValue);
            onUpdateCase({ ...row, name: editValue as string, email: selectedUser?.email || '' });
        } else {
            onUpdateCase({ ...row, [editingCell.columnKey]: valueToSave });
        }
        setEditingCell(null);
    };

    const handleCellClick = (row: CaseData, columnKey: keyof CaseData) => {
        if (isMultiEditMode) return;
        setEditingCell({ rowId: row.id, columnKey });
        // FIX: Ensure value is always a string or number, preventing errors with complex types like arrays.
        setEditValue(String(row[columnKey] ?? ''));
    };
    
    const openAddModal = () => {
        setEditingCase(null);
        setCaseModalOpen(true);
    };

    const openEditModal = (caseData: CaseData) => {
        setEditingCase(caseData);
        setCaseModalOpen(true);
    };
    
    const openTramitationModal = (caseData: CaseData) => {
        setTramitatingCase(caseData);
        setTramitationModalOpen(true);
    };

    const openDeleteConfirm = (caseData: CaseData) => {
        setConfirmModalState({
            isOpen: true,
            title: "Excluir Caso",
            onConfirm: () => onDeleteCase(caseData.id),
            children: <p className="text-sm text-gray-500">Tem certeza que deseja excluir o caso <strong>{`${caseData.processoNumero} (${caseData.autor} vs ${caseData.reu})`}</strong>? Esta ação não pode ser desfeita.</p>
        });
    };
    
    const openMultiDeleteConfirm = () => {
         if (selectedCaseIds.size === 0) return;
         setConfirmModalState({
            isOpen: true,
            title: `Excluir ${selectedCaseIds.size} Casos`,
            onConfirm: () => {
                onDeleteMultipleCases(Array.from(selectedCaseIds));
                setSelectedCaseIds(new Set());
            },
            children: <p className="text-sm text-gray-500">Tem certeza que deseja excluir os <strong>{selectedCaseIds.size}</strong> casos selecionados? Esta ação não pode ser desfeita.</p>
        });
    };

    const openDeleteAllConfirm = () => {
         if (sortedCases.length === 0) return;
         setConfirmModalState({
            isOpen: true,
            title: "Excluir Todos os Casos",
            onConfirm: () => {
                onDeleteMultipleCases(sortedCases.map(c => c.id));
                 setSelectedCaseIds(new Set());
            },
            children: <p className="text-sm text-gray-500">Tem certeza que deseja excluir todos os <strong>{sortedCases.length}</strong> casos visíveis? Esta ação não pode ser desfeita.</p>
        });
    };

    const closeConfirmModal = () => {
        setConfirmModalState(prev => ({...prev, isOpen: false}));
    };

    const requestSort = (key: keyof CaseData | 'tramitadoPara') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedCases = useMemo(() => {
        const sourceData = isMultiEditMode ? draftCases : cases;
        if (!sortConfig) {
            return sourceData;
        }

        const sortableItems = [...sourceData];
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'tramitadoPara') {
                 aValue = a.tramitationLog?.[a.tramitationLog.length - 1]?.toUser || '';
                 bValue = b.tramitationLog?.[b.tramitationLog.length - 1]?.toUser || '';
            } else {
                 aValue = a[sortConfig.key as keyof CaseData];
                 bValue = b[sortConfig.key as keyof CaseData];
            }
            
            if (sortConfig.key === 'prioridade') {
                const priorityOrder: Record<CaseData['prioridade'], number> = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
                return (priorityOrder[a.prioridade] - priorityOrder[b.prioridade]) * (sortConfig.direction === 'asc' ? 1 : -1);
            }

            const dateKeys: Array<keyof CaseData> = ['dataNomeacao', 'dataInicial', 'dataDesignada', 'dataFinal', 'dataAtribuida'];
            if (dateKeys.includes(sortConfig.key as keyof CaseData)) {
                const dateA = new Date(aValue as string).getTime();
                const dateB = new Date(bValue as string).getTime();
                if (isNaN(dateA) || isNaN(dateB)) return 0;
                return (dateA - dateB) * (sortConfig.direction === 'asc' ? 1 : -1);
            }
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sortableItems;
    }, [cases, sortConfig, isMultiEditMode, draftCases]);


    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array', cellText: false, cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = utils.sheet_to_json(worksheet, { raw: false });

                const normalizeHeader = (header: string) => header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                const keyMap: Record<string, keyof CaseData> = {};
                for (const [header, dataKey] of Object.entries(HEADER_KEY_MAP)) {
                    keyMap[normalizeHeader(header)] = dataKey;
                }
                
                const newCases = json.map(row => {
                    const caseObj: Partial<CaseData> = {};
                    Object.entries(row).forEach(([header, value]) => {
                        const normalizedHeader = normalizeHeader(header);
                        const dataKey = keyMap[normalizedHeader];

                        if (dataKey) {
                            let processedValue = typeof value === 'string' ? value.trim() : value;
                             if (processedValue instanceof Date) {
                                processedValue = processedValue.toISOString().split('T')[0];
                            }
                            (caseObj as any)[dataKey] = processedValue;
                        }
                    });

                    // "Atribuído a" is the primary source ('name'). "Responsável" is the fallback ('ownerName').
                    const assigneeName = caseObj.name || caseObj.ownerName;
                    caseObj.ownerName = 'Ms Tributário'; // Hardcode the company owner
                    caseObj.name = assigneeName; // Assignee goes to 'name'

                    delete (caseObj as any).id;
                    delete (caseObj as any).id2;
                    return caseObj as Omit<CaseData, 'id' | 'id2'>;
                });
                
                onImportCases(newCases);

            } catch (error) {
                 alert('Erro ao importar o arquivo. Verifique se o formato e as colunas estão corretos.');
                 console.error("Error importing file: ", error);
            } finally {
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExport = () => {
        const dataToExport = sortedCases.map(caseItem => {
            const row: Record<string, any> = {};
            visibleColumns.forEach(header => {
                const key = HEADER_KEY_MAP[header] as keyof CaseData;
                if (key) {
                    if (dateKeys.includes(key)) {
                        row[header] = formatDate(caseItem[key] as string);
                    } else {
                        row[header] = caseItem[key];
                    }
                }
            });
            return row;
        });

        const worksheet = utils.json_to_sheet(dataToExport);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Casos");
        const fileName = isAdminView ? "all_cases.xlsx" : "my_cases.xlsx";
        writeFile(workbook, fileName);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCaseIds(new Set(sortedCases.map(c => c.id)));
        } else {
            setSelectedCaseIds(new Set());
        }
    };

    const handleSelectRow = (caseId: number, isSelected: boolean) => {
        const newSelection = new Set(selectedCaseIds);
        if (isSelected) {
            newSelection.add(caseId);
        } else {
            newSelection.delete(caseId);
        }
        setSelectedCaseIds(newSelection);
    };
    
    useEffect(() => {
        if (!isMultiEditMode) {
            setSelectedCaseIds(new Set());
        }
    }, [cases, isMultiEditMode]);

    // FIX: Add ref and useEffect to handle the indeterminate state of the "select all" checkbox.
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = selectedCaseIds.size > 0 && selectedCaseIds.size < sortedCases.length;
        }
    }, [selectedCaseIds, sortedCases]);

    // --- Multi-edit handlers ---
    const handleEnableMultiEdit = () => {
        setDraftCases(JSON.parse(JSON.stringify(cases))); // Deep copy
        setModifiedCaseIds(new Set());
        setIsMultiEditMode(true);
    };
    
    const handleCancelMultiEdit = () => {
        setIsMultiEditMode(false);
        setDraftCases([]);
        setModifiedCaseIds(new Set());
    };

    const handleSaveMultiEdit = () => {
        const updatedCases = draftCases.filter(c => modifiedCaseIds.has(c.id));
        onUpdateMultipleCases(updatedCases);
        handleCancelMultiEdit();
    };
    
    const handleMultiEditChange = (caseId: number, field: keyof CaseData, value: any) => {
        setDraftCases(prev => prev.map(c => {
            if (c.id === caseId) {
                const updatedCase = { ...c, [field]: value };
                // If assignee ('name') changes, also update email
                if (field === 'name') {
                    const selectedUser = users.find(u => u.name === value);
                    updatedCase.email = selectedUser?.email || '';
                }
                return updatedCase;
            }
            return c;
        }));
        setModifiedCaseIds(prev => new Set(prev).add(caseId));
    };


    const userHiddenColumns = [
        'Valor da Ação',
        'DATA FINAL CORRIDOS',
        'DIAS ÚTEIS',
        'Start Hour',
        'Finish Hour',
        'Data Designada',
        'PRAZO DETERMINADO',
        'Data Nomeação',
        'Responsável',
        'E-mail',
        'Tramitado Para',
        'Co-responsável'
    ];

    const visibleColumns = isAdminView 
        ? COLUMN_HEADERS 
        : COLUMN_HEADERS.filter(h => !userHiddenColumns.includes(h));
    
    const editableColumns: (keyof CaseData)[] = ['fases', 'status', 'name', 'coResponsibleName', 'processoNumero', 'dataNomeacao', 'dataInicial', 'dataDesignada', 'dataFinal', 'dataAtribuida', 'segredoDeJustica', 'tribunal', 'prioridade'];
    const dateKeys: (keyof CaseData)[] = ['dataNomeacao', 'dataInicial', 'dataDesignada', 'dataFinal', 'dataFinalCorridos', 'dataAtribuida'];

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
             <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">{isAdminView ? 'All Cases' : 'My Cases'}</h2>
                <div className="flex gap-2 flex-wrap justify-center items-center">
                    {isAdminView ? (
                        <>
                         {isMultiEditMode ? (
                            <>
                               <button onClick={handleCancelMultiEdit} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancelar Edição</button>
                               <button onClick={handleSaveMultiEdit} disabled={modifiedCaseIds.size === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Salvar Alterações ({modifiedCaseIds.size})</button>
                            </>
                         ) : (
                            <>
                                <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Adicionar Caso</button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors">Importar Excel</button>
                                
                                <button onClick={openMultiDeleteConfirm} disabled={selectedCaseIds.size === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                    Excluir Selecionados
                                </button>
                                <div className="relative inline-block text-left">
                                    <button onClick={() => setMenuOpen(!isMenuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 200)} type="button" className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                                        Mais Ações
                                        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                    {isMenuOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                            <div className="py-1" role="menu" aria-orientation="vertical">
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleEnableMultiEdit(); setMenuOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Edição Múltipla</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); setPasteModalOpen(true); setMenuOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Importar por Colagem</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleExport(); setMenuOpen(false);}} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Exportar Casos</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); openDeleteAllConfirm(); setMenuOpen(false); }} className="text-red-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Excluir Todos os Casos</a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                         )}
                        </>
                    ) : (
                        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                            Export My Cases
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto overflow-x-auto max-h-[320px]">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                             {isAdminView && (
                                <th scope="col" className="px-4 py-2 w-12" style={{width: '3rem'}}>
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    ref={selectAllCheckboxRef}
                                    checked={selectedCaseIds.size > 0 && selectedCaseIds.size === sortedCases.length}
                                    onChange={handleSelectAll}
                                    disabled={isMultiEditMode}
                                    />
                                </th>
                             )}
                             <th scope="col" className="px-2 py-2 text-center text-[9px] font-medium text-gray-500 uppercase tracking-wider w-10" title="Status do Prazo">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </th>
                            {visibleColumns.map((header) => {
                                const columnKey = HEADER_KEY_MAP[header] as keyof CaseData | 'tramitadoPara';
                                if (!columnKey) return <th key={header} scope="col">{header}</th>;
                                return (
                                <th key={header} scope="col"
                                    className="px-4 py-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative"
                                    style={{ width: columnWidths[columnKey] ? `${columnWidths[columnKey]}px` : undefined }}
                                >
                                    <button type="button" onClick={() => requestSort(columnKey)} className="flex items-center gap-1.5 w-full text-left font-medium text-gray-500 uppercase tracking-wider group focus:outline-none">
                                        <span>{header}</span>
                                        <span>{sortConfig?.key === columnKey ? (sortConfig.direction === 'asc' ? '▲' : '▼') : (<span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">↕</span>)}</span>
                                    </button>
                                    <div
                                        onMouseDown={handleMouseDown(columnKey)}
                                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-20 hover:bg-indigo-200"
                                    />
                                </th>
                            )})}
                             {isAdminView && <th scope="col" className="px-4 py-2 text-right text-[9px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-28" style={{width: '7rem'}}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedCases.map((row: CaseData) => {
                            const deadlineStatus = getDeadlineStatus(row.dataFinal, row.status);
                            const isModified = modifiedCaseIds.has(row.id);
                            return (
                            <tr key={row.id} className={`transition-colors ${selectedCaseIds.has(row.id) ? 'bg-indigo-50' : (isModified ? 'bg-yellow-50' : 'hover:bg-gray-50')}`}>
                                {isAdminView && (
                                    <td className="px-4 py-2">
                                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={selectedCaseIds.has(row.id)}
                                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                                        disabled={isMultiEditMode}
                                        />
                                    </td>
                                )}
                                <td className="px-2 py-2 text-center">
                                    <DeadlineStatusIndicator status={deadlineStatus} deadline={row.dataFinal} />
                                </td>
                                {visibleColumns.map(header => {
                                    const key = HEADER_KEY_MAP[header] as keyof CaseData | 'tramitadoPara';
                                    let value;
                                    if (key === 'tramitadoPara') {
                                        const lastLog = row.tramitationLog && row.tramitationLog.length > 0 ? row.tramitationLog[row.tramitationLog.length - 1] : null;
                                        value = lastLog ? lastLog.toUser : 'N/A';
                                    } else {
                                        value = row[key as keyof CaseData];
                                    }
                                    
                                    const displayValue = dateKeys.includes(key as keyof CaseData) ? formatDate(value as string) : String(value ?? '');

                                    const isEditable = isAdminView && editableColumns.includes(key as keyof CaseData);
                                    const isEditing = !isMultiEditMode && editingCell?.rowId === row.id && editingCell?.columnKey === key;
                                    
                                    const cellCommonClasses = "px-4 py-1 whitespace-nowrap text-[9px] text-gray-600";
                                    const inputCommonClasses = "w-full p-1 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[9px]";

                                    if (isMultiEditMode && isEditable) {
                                        return (
                                            <td key={header} className={`${cellCommonClasses} py-1`}>
                                            {
                                                (key === 'fases' || key === 'status' || key === 'coResponsibleName' || key === 'name' || key === 'segredoDeJustica' || key === 'tribunal' || key === 'prioridade') ? (
                                                    <select
                                                        value={value as string || ''}
                                                        onChange={(e) => handleMultiEditChange(row.id, key as keyof CaseData, e.target.value)}
                                                        className={`${inputCommonClasses} border-gray-300 bg-white`}
                                                    >
                                                        {key === 'fases' && fases.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                                        {key === 'status' && statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                        {key === 'tribunal' && tribunals.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                                        {(key === 'coResponsibleName' || key === 'name') && (<>
                                                             <option value="">Nenhum</option>
                                                            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                                        </>)}
                                                        {key === 'segredoDeJustica' && (<><option value="Não">Não</option><option value="Sim">Sim</option></>)}
                                                        {key === 'prioridade' && (<><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option></>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={dateKeys.includes(key as keyof CaseData) ? 'date' : 'text'}
                                                        value={value as string || ''}
                                                        onChange={(e) => handleMultiEditChange(row.id, key as keyof CaseData, e.target.value)}
                                                        className={`${inputCommonClasses} border-gray-300 bg-white`}
                                                    />
                                                )
                                            }
                                            </td>
                                        )
                                    }

                                    const isAssigneeColumn = key === 'name';
                                    const isMateriaColumn = header === 'MATÉRIA';
                                    const isAutorReuColumn = header === 'AUTOR' || header === 'RÉU';
                                    const isVaraNaturezaColumn = header === 'VARA/COMARCA' || header === 'Natureza Ação';

                                    let cellClasses = `${cellCommonClasses} py-2`;
                                    if (isEditable && !isAssigneeColumn) cellClasses += ' cursor-pointer';
                                    
                                    let maxWidthClass = '';
                                    if (isMateriaColumn) maxWidthClass = ' max-w-[200px]';
                                    if (isAutorReuColumn) maxWidthClass = ' max-w-[150px]';
                                    if (isVaraNaturezaColumn) maxWidthClass = ' max-w-[180px]';

                                    if (maxWidthClass) cellClasses += ' truncate' + maxWidthClass;

                                    return (
                                        <td key={header} className={cellClasses} title={(isMateriaColumn || isAutorReuColumn || isVaraNaturezaColumn) ? displayValue : undefined} onClick={() => isEditable && !isAssigneeColumn && !isEditing && handleCellClick(row, key as keyof CaseData)}>
                                            {isEditing ? (
                                                (key === 'fases' || key === 'status' || key === 'coResponsibleName' || key === 'segredoDeJustica' || key === 'tribunal') ? (
                                                    <select
                                                        value={editValue as string}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleEditSave(row)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(row); if (e.key === 'Escape') setEditingCell(null); }}
                                                        className={`${inputCommonClasses} border-indigo-500 bg-yellow-50`}
                                                        autoFocus
                                                    >
                                                        {key === 'fases' ? fases.map(f => <option key={f.id} value={f.name}>{f.name}</option>) : 
                                                        key === 'status' ? statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>) :
                                                        key === 'tribunal' ? tribunals.map(t => <option key={t.id} value={t.name}>{t.name}</option>) :
                                                        key === 'segredoDeJustica' ? (<>
                                                            <option value="Não">Não</option>
                                                            <option value="Sim">Sim</option>
                                                        </>) :
                                                        (<>
                                                            <option value="">Nenhum</option>
                                                            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                                        </>)
                                                        }
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={dateKeys.includes(key as keyof CaseData) ? 'date' : 'text'}
                                                        value={editValue as string}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => handleEditSave(row)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(row); if (e.key === 'Escape') setEditingCell(null); }}
                                                        className={`${inputCommonClasses} border-indigo-500 bg-yellow-50`}
                                                        autoFocus
                                                    />
                                                )
                                            ) : ( 
                                                isAssigneeColumn ? (
                                                     <div className="flex items-center justify-between">
                                                        <span>{displayValue}</span>
                                                        <button onClick={() => openTramitationModal(row)} className="ml-2 p-1 text-gray-400 rounded-full hover:bg-indigo-100 hover:text-indigo-600 transition-opacity" title="Tramitar caso">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    header === 'Prioridade' ? <PriorityBadge priority={row.prioridade} /> : displayValue
                                                )
                                            )}
                                        </td>
                                    )
                                })}
                                {isAdminView && (
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-[9px] font-medium space-x-2">
                                        {!isMultiEditMode && <>
                                            <button onClick={() => openEditModal(row)} className="text-indigo-600 hover:text-indigo-900 transition-colors">Editar</button>
                                            <button onClick={() => openDeleteConfirm(row)} className="text-red-600 hover:text-red-900 transition-colors">Excluir</button>
                                        </>}
                                    </td>
                                )}
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>

            {isCaseModalOpen && (
                <CaseModal
                    caseData={editingCase}
                    users={users}
                    tribunals={tribunals}
                    fases={fases}
                    statuses={statuses}
                    onClose={() => setCaseModalOpen(false)}
                    onSave={(dataFromModal) => {
                        if (editingCase) {
                            onUpdateCase({ ...editingCase, ...dataFromModal });
                        } else {
                            const { id: _unusedId, id2: _unusedId2, ...casePayload } = dataFromModal;
                            const newCase = { ...DEFAULT_CASE_DATA, ...casePayload };
                            onAddCase(newCase);
                        }
                        setCaseModalOpen(false);
                    }}
                    isAdminView={isAdminView}
                />
            )}
            {isTramitationModalOpen && tramitatingCase && (
                <TramitationModal
                    caseData={tramitatingCase}
                    users={users}
                    isAdminView={isAdminView}
                    onClose={() => setTramitationModalOpen(false)}
                    onTramitate={(caseId, toUser, deadline, attachment) => {
                        onTramitateCase(caseId, toUser, deadline, attachment);
                        setTramitationModalOpen(false);
                    }}
                />
            )}
            {isPasteModalOpen && (
                <PasteImportModal onClose={() => setPasteModalOpen(false)} onImport={(newCases) => { onImportCases(newCases); setPasteModalOpen(false); }} users={users} />
            )}
            {confirmModalState.isOpen && (
                 <ConfirmationModal title={confirmModalState.title} onClose={closeConfirmModal} onConfirm={() => { confirmModalState.onConfirm(); closeConfirmModal(); }}>
                    {confirmModalState.children}
                 </ConfirmationModal>
            )}
        </div>
    );
};

const ConfirmationModal: React.FC<{
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ title, children, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative mx-auto p-8 border w-full max-w-md shadow-lg rounded-xl bg-white">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-5">{title}</h3>
                <div className="mt-2 px-7 py-3">
                    {children}
                </div>
                <div className="flex justify-center gap-4 mt-4">
                     <button onClick={onClose} type="button" className="px-4 py-2 bg-gray-200 text-gray-900 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button>
                     <button onClick={onConfirm} type="button" className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">Excluir</button>
                </div>
            </div>
        </div>
    </div>
);

const DEFAULT_CASE_DATA: Omit<CaseData, 'id' | 'id2'> = {
    tribunal: '',
    processoNumero: '',
    autor: '',
    reu: '',
    trib: '',
    varaComarca: '',
    materia: '',
    ownerName: 'Ms Tributário',
    name: '',
    email: '',
    dataNomeacao: '',
    dataInicial: '',
    prazoDeterminado: '',
    dataDesignada: '',
    dataFinal: '',
    startHour: '09:00',
    finishHour: '18:00',
    dataFinalCorridos: '',
    diasUteis: 0,
    prioridade: 'Baixa',
    dataAtribuida: '',
    fases: '',
    status: '',
    segredoDeJustica: 'Não',
    naturezaAcao: '',
    valorDaAcao: '',
};

const PasteImportModal: React.FC<{
    onClose: () => void;
    onImport: (cases: Omit<CaseData, 'id' | 'id2'>[]) => void;
    users: User[];
}> = ({ onClose, onImport, users }) => {
    const [pastedText, setPastedText] = useState('');
    
    const normalizeText = (text: string) => text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const handleImport = () => {
        if (!pastedText.trim()) return alert("Por favor, cole os dados no campo de texto.");
        try {
            const rows = pastedText.trim().split('\n');
            const headerRow = rows.shift();
            if (!headerRow) return alert("Não foi possível encontrar a linha de cabeçalho. Certifique-se de copiar os cabeçalhos.");
            
            const headers = headerRow.split('\t').map(h => normalizeText(h));
            const keyMap: Record<string, keyof CaseData> = {};
            for (const [header, dataKey] of Object.entries(HEADER_KEY_MAP)) {
                keyMap[normalizeText(header)] = dataKey;
            }
            
            const importedCases = rows.map(rowStr => {
                const values = rowStr.split('\t');
                const parsedData: Partial<CaseData> = {};
                
                headers.forEach((header, index) => {
                    const dataKey = keyMap[header];
                    if (dataKey && values[index]) {
                         let value: any = values[index].trim();
                        (parsedData as any)[dataKey] = value;
                    }
                });

                // "Atribuído a" is the primary source ('name'). "Responsável" is the fallback ('ownerName').
                const assigneeName = parsedData.name || parsedData.ownerName;
                parsedData.ownerName = 'Ms Tributário'; // Hardcode owner
                parsedData.name = assigneeName; // Assignee goes to 'name'

                if (Object.keys(parsedData).length === 0) return null;
                const { id, id2, ...finalCase } = { ...DEFAULT_CASE_DATA, ...parsedData };
                return finalCase;

            }).filter((c): c is Omit<CaseData, 'id' | 'id2'> => c !== null && !!c.processoNumero);
            
            if (importedCases.length === 0) return alert("Nenhum caso válido encontrado. Verifique os cabeçalhos e se 'PROCESSO NÚMERO' está preenchida.");
            onImport(importedCases);

        } catch (error) {
            alert("Ocorreu um erro ao processar os dados. Verifique o formato do texto colado.");
            console.error("Paste import error:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-3xl shadow-lg rounded-xl bg-white">
                <h3 className="text-2xl font-semibold mb-4">Importar por Colagem</h3>
                <p className="text-sm text-gray-600 mb-4">Copie os dados da sua planilha e cole abaixo. A primeira linha deve conter os cabeçalhos.</p>
                <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} className="w-full h-64 p-3 border border-gray-300 rounded-md shadow-sm font-mono text-sm bg-white text-gray-900" placeholder="Cole os dados da sua planilha aqui..."/>
               <div className="flex items-center justify-end space-x-4 pt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button type="button" onClick={handleImport} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Importar Dados</button>
               </div>
            </div>
        </div>
    );
};


const CaseModal: React.FC<{
    caseData: CaseData | null;
    onClose: () => void;
    onSave: (data: Partial<CaseData>) => void;
    users: User[];
    tribunals: Tribunal[];
    fases: Fase[];
    statuses: Status[];
    isAdminView: boolean;
}> = ({ caseData, onClose, onSave, users, tribunals, fases, statuses, isAdminView }) => {
    const [formData, setFormData] = useState<Partial<CaseData>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const requiredFields: (keyof CaseData)[] = [ 'processoNumero', 'autor', 'reu', 'name', 'tribunal', 'fases', 'status' ];

        for(const key of requiredFields) {
            if (!formData[key] || String(formData[key]).trim() === '') {
                const fieldName = COLUMN_HEADERS.find(h => HEADER_KEY_MAP[h] === key) || key;
                newErrors[key] = `O campo '${fieldName}' é obrigatório.`;
            }
        }
        
        if (formData.processoNumero && formData.processoNumero.length < 10) {
            newErrors['processoNumero'] = 'O número do processo parece ser muito curto. Verifique o valor inserido.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    useEffect(() => {
        if (caseData) {
            setFormData(caseData);
        } else {
            const defaultOwner = users.find(u => u.name === 'Ms Tributário');
            setFormData({ 
                ...DEFAULT_CASE_DATA, 
                ownerName: 'Ms Tributário',
                name: defaultOwner?.name || '',
                email: defaultOwner?.email || '',
                fases: fases.length > 0 ? fases[0].name : '',
                status: statuses.length > 0 ? statuses[0].name : ''
            });
        }
    }, [caseData, users, fases, statuses]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[name];
                return newErrors;
            })
        }
    };

    const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedName = e.target.value;
        const selectedUser = users.find(u => u.name === selectedName);
        setFormData(prev => ({ ...prev, name: selectedName, email: selectedUser ? selectedUser.email : '' }));
         if (errors['name']) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors['name'];
                return newErrors;
            })
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
          onSave(formData);
        }
    }
    
    const userHiddenColumns = [
        'Valor da Ação', 'DATA FINAL CORRIDOS', 'DIAS ÚTEIS', 'Start Hour', 
        'Finish Hour', 'Data Designada', 'PRAZO DETERMINADO', 'Data Nomeação', 
        'Responsável', 'E-mail', 'Tramitado Para', 'Co-responsável'
    ];

    const fields = COLUMN_HEADERS.filter(h => h !== 'ID_2' && h !== 'DIAS ÚTEIS' && h !== 'Tramitado Para' && h !== 'Start Hour' && h !== 'Finish Hour');
    const visibleFields = isAdminView ? fields : fields.filter(h => !userHiddenColumns.includes(h));

    const dateInputKeys: (keyof CaseData)[] = ['dataNomeacao', 'dataInicial', 'dataDesignada', 'dataFinal', 'dataAtribuida'];

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
                <h3 className="text-2xl font-semibold mb-6">{caseData ? 'Editar Caso' : 'Adicionar Caso'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {visibleFields.map(field => {
                        const key = HEADER_KEY_MAP[field] as keyof CaseData;
                         if (!key) return null;
                         const error = errors[key];
                         const commonClasses = "w-full px-3 py-2 border rounded-md shadow-sm";
                         const errorClasses = error ? "border-red-500" : "border-gray-300";

                         if (key === 'tribunal' || key === 'fases' || key === 'status') {
                             const options = key === 'tribunal' ? tribunals : (key === 'fases' ? fases : statuses);
                             return (
                                 <div key={key}>
                                     <label className="text-sm font-medium text-gray-700 block mb-1">{field}</label>
                                     <select name={key} value={formData[key] || ''} onChange={handleChange} className={`${commonClasses} ${errorClasses} bg-white text-gray-900`}>
                                         <option value="" disabled>Selecione um item</option>
                                         {options.map(o => (<option key={o.id} value={o.name}>{o.name}</option>))}
                                     </select>
                                     {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                                 </div>
                             );
                         }

                         if (key === 'name') { // Changed from ownerName to name
                             return (
                                 <div key={key}>
                                     <label className="text-sm font-medium text-gray-700 block mb-1">{field}</label>
                                     <select name="name" value={formData.name || ''} onChange={handleAssigneeChange} className={`${commonClasses} ${errorClasses} bg-white text-gray-900`}>
                                        <option value="" disabled>Selecione um atribuído</option>
                                        {users.map(user => (<option key={user.id} value={user.name}>{user.name}</option>))}
                                     </select>
                                     {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                                 </div>
                             );
                         }

                         if (key === 'coResponsibleName') {
                             return (
                                 <div key={key}>
                                     <label className="text-sm font-medium text-gray-700 block mb-1">{field}</label>
                                     <select name={key} value={formData[key] || ''} onChange={handleChange} className={`${commonClasses} ${errorClasses} bg-white text-gray-900`}>
                                        <option value="">Selecione um co-responsável</option>
                                        {users.map(user => (<option key={user.id} value={user.name}>{user.name}</option>))}
                                     </select>
                                     {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                                 </div>
                             );
                         }
                         
                         if (key === 'prioridade' || key === 'segredoDeJustica') {
                             return (
                                 <div key={key}>
                                     <label className="text-sm font-medium text-gray-700 block mb-1">{field}</label>
                                     <select name={key} value={formData[key]} onChange={handleChange} className={`${commonClasses} border-gray-300 bg-white text-gray-900`}>
                                         {key === 'prioridade' ? <><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option></> : <><option value="Não">Não</option><option value="Sim">Sim</option></>}
                                     </select>
                                 </div>
                             )
                         }
                         
                         if (key === 'ownerName' || key === 'email') { // Responsável and E-mail are read-only
                           return (
                                <div key={key}>
                                  <label className="text-sm font-medium text-gray-700 block mb-1">{field}</label>
                                  <input type="text" name={key} value={formData[key as keyof Partial<CaseData>] as string || ''} onChange={handleChange} className={`${commonClasses} border-gray-300 bg-gray-100 text-gray-600`} readOnly />
                                </div>
                           )
                         }

                         const isDateInput = dateInputKeys.includes(key);
                         const inputType = isDateInput ? 'date' : 'text';
                         
                         let inputSpecificClasses = '';
                         if (isDateInput) {
                            inputSpecificClasses = formData[key] ? 'bg-white text-gray-900' : 'bg-white text-gray-500';
                         } else {
                            inputSpecificClasses = 'bg-white text-gray-900';
                         }

                         return (
                            <div key={key}>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{field}</label>
                                {inputType === 'date' ? (
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            name={key} 
                                            value={formData[key as keyof Partial<CaseData>] as string || ''} 
                                            onChange={handleChange} 
                                            className={`${commonClasses} ${errorClasses} ${inputSpecificClasses} pr-10`}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                ) : (
                                    <input 
                                        type={inputType} 
                                        name={key} 
                                        value={formData[key as keyof Partial<CaseData>] as string || ''} 
                                        onChange={handleChange} 
                                        className={`${commonClasses} ${errorClasses} ${inputSpecificClasses}`} 
                                    />
                                )}
                                {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                            </div>
                         )
                     })}
                   </div>
                   <div className="flex items-center justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salvar</button>
                   </div>
                </form>
            </div>
        </div>
    );
};

const TramitationModal: React.FC<{
    caseData: CaseData;
    onClose: () => void;
    onTramitate: (caseId: number, toUserName: string, deadline: string, attachmentFile?: File) => void;
    users: User[];
    isAdminView: boolean;
}> = ({ caseData, onClose, onTramitate, users, isAdminView }) => {
    const [toUserName, setToUserName] = useState<string>('');
    const [deadline, setDeadline] = useState<string>('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [error, setError] = useState<string>('');

    const usersForTramitation = useMemo(() => {
        const potentialUsers = isAdminView 
            ? users 
            : users.filter(u => u.permission === 'adm');
        
        return potentialUsers.filter(u => u.name !== caseData.name);
    }, [users, isAdminView, caseData.name]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachment(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!toUserName || !deadline) {
            setError('Selecione um usuário e uma data de prazo.');
            return;
        }
        onTramitate(caseData.id, toUserName, deadline, attachment || undefined);
    };
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-3xl shadow-lg rounded-xl bg-white">
                <h3 className="text-2xl font-semibold mb-2">Tramitação de Caso</h3>
                <p className="text-sm text-gray-600 mb-6">Processo: {caseData.processoNumero}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* New Tramitation Form */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-800 border-b pb-2">Nova Tramitação</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                             <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Tramitar para:</label>
                                <select value={toUserName} onChange={e => setToUserName(e.target.value)} className="w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 bg-white text-gray-900">
                                    <option value="" disabled>Selecione um usuário</option>
                                    {usersForTramitation.map(user => (
                                        <option key={user.id} value={user.name}>{user.name}</option>
                                    ))}
                                </select>
                             </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Prazo Final:</label>
                                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 border rounded-md shadow-sm border-gray-300 bg-white text-gray-900" />
                             </div>
                             <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Anexar Arquivo (Opcional)</label>
                                <input 
                                    type="file" 
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    accept=".zip,.rar,.doc,.docx,.xls,.xlsx,.txt,.csv,.pdf"
                                />
                                {attachment && <p className="text-xs text-gray-500 mt-1">Selecionado: {attachment.name}</p>}
                            </div>
                             {error && <p className="text-red-600 text-xs">{error}</p>}
                             <div className="flex items-center justify-end space-x-4 pt-4">
                                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Tramitar</button>
                           </div>
                        </form>
                    </div>

                    {/* Tramitation History */}
                     <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-800 border-b pb-2">Histórico de Tramitação</h4>
                        <div className="max-h-64 overflow-y-auto pr-2">
                             {(caseData.tramitationLog && caseData.tramitationLog.length > 0) ? (
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-2">De → Para</th>
                                            <th scope="col" className="px-4 py-2">Data</th>
                                            <th scope="col" className="px-4 py-2">Prazo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...caseData.tramitationLog].reverse().map((log, index) => (
                                            <tr key={index} className="bg-white border-b">
                                                <td className="px-4 py-2 font-medium text-gray-900">{log.fromUser} → {log.toUser}</td>
                                                <td className="px-4 py-2">{formatDateTime(log.timestamp)}</td>
                                                <td className="px-4 py-2">{formatDate(log.deadline)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             ) : (
                                <p className="text-sm text-gray-500 italic mt-4">Nenhuma tramitação registrada.</p>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Spreadsheet;