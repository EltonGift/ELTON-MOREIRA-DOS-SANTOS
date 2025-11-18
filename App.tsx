import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Login from './components/Login';
import Spreadsheet from './components/Spreadsheet';
import Admin from './components/Admin';
import Dashboard from './components/Dashboard';
import KpiDashboard from './components/KpiDashboard';
import GlobalKpiDashboard from './components/GlobalKpiDashboard';
import TramitationHistory from './components/TramitationHistory';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView'; // Added
import Sidebar from './components/Sidebar'; // Added
import { MOCK_USERS, MOCK_DATA, MOCK_TRIBUNALS, MOCK_FASES, MOCK_STATUS } from './constants';
import type { User, CaseData, Tribunal, Fase, Status, TramitationEntry, Attachment } from './types';

type Tab = 'dashboard' | 'spreadsheet' | 'kanban' | 'calendar' | 'history' | 'admin' | 'archived';
type KanbanGroupBy = 'status' | 'fases' | 'name' | 'coResponsibleName' | 'tribunal';

// Helper function to load data from localStorage
const loadFromLocalStorage = <T,>(key: string, fallbackData: T): T => {
  try {
    const storedData = window.localStorage.getItem(key);
    if (storedData) {
      return JSON.parse(storedData);
    }
    // Only set item if it doesn't exist to prevent overwriting
    window.localStorage.setItem(key, JSON.stringify(fallbackData));
    return fallbackData;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage, falling back to default.`, error);
    try {
        window.localStorage.removeItem(key);
    } catch (removeError) {
        console.error(`Failed to remove corrupted key ${key} from localStorage.`, removeError);
    }
    window.localStorage.setItem(key, JSON.stringify(fallbackData));
    return fallbackData;
  }
};

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ARCHIVED_STATUS_NAME = 'Arquivado';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => loadFromLocalStorage('legal_users_data', MOCK_USERS));
  const [cases, setCases] = useState<CaseData[]>(() => loadFromLocalStorage('legal_cases_data', MOCK_DATA));
  const [tribunals, setTribunals] = useState<Tribunal[]>(() => loadFromLocalStorage('legal_tribunals_data', MOCK_TRIBUNALS));
  const [fases, setFases] = useState<Fase[]>(() => loadFromLocalStorage('legal_fases_data', MOCK_FASES));
  const [statuses, setStatuses] = useState<Status[]>(() => loadFromLocalStorage('legal_statuses_data', MOCK_STATUS));
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [kanbanGroupBy, setKanbanGroupBy] = useState<KanbanGroupBy>('status');

  const [globalFilters, setGlobalFilters] = useState<{ searchTerm: string; priority: string; ownerName?: string; }>({ searchTerm: '', priority: 'all', ownerName: 'all' });
  const [myFilters, setMyFilters] = useState({ searchTerm: '', priority: 'all' });
  
  // Save to localStorage whenever data changes
  useEffect(() => { window.localStorage.setItem('legal_users_data', JSON.stringify(users)); }, [users]);
  useEffect(() => { window.localStorage.setItem('legal_cases_data', JSON.stringify(cases)); }, [cases]);
  useEffect(() => { window.localStorage.setItem('legal_tribunals_data', JSON.stringify(tribunals)); }, [tribunals]);
  useEffect(() => { window.localStorage.setItem('legal_fases_data', JSON.stringify(fases)); }, [fases]);
  useEffect(() => { window.localStorage.setItem('legal_statuses_data', JSON.stringify(statuses)); }, [statuses]);


  // Use a ref to ensure unique IDs are generated, initialized with the max ID from loaded data
  const lastUserId = useRef(users.length > 0 ? Math.max(...users.map(u => u.id)) : 0);
  const lastCaseId = useRef(cases.length > 0 ? Math.max(...cases.map(c => c.id)) : 0);
  const lastTribunalId = useRef(tribunals.length > 0 ? Math.max(...tribunals.map(t => t.id)) : 0);
  const lastFaseId = useRef(fases.length > 0 ? Math.max(...fases.map(f => f.id)) : 0);
  const lastStatusId = useRef(statuses.length > 0 ? Math.max(...statuses.map(s => s.id)) : 0);


  const getNextUserId = () => ++lastUserId.current;
  const getNextCaseId = () => ++lastCaseId.current;
  const getNextTribunalId = () => ++lastTribunalId.current;
  const getNextFaseId = () => ++lastFaseId.current;
  const getNextStatusId = () => ++lastStatusId.current;
  

  const handleLogin = useCallback((email: string, password: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      setLoginError(null);
      setActiveTab(user.permission === 'adm' ? 'dashboard' : 'spreadsheet');
    } else {
      setLoginError('Credenciais inválidas. Tente novamente.');
    }
  }, [users]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);
  
  // User Management
  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    if (users.some(u => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase())) {
      alert(`Erro: O e-mail '${newUser.email}' já está cadastrado.`);
      return;
    }
    setUsers(prev => [...prev, { ...newUser, id: getNextUserId() }]);
  };
  const handleUpdateUser = (updatedUser: User) => {
    if (users.some(u => u.id !== updatedUser.id && u.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase())) {
      alert(`Erro: O e-mail '${updatedUser.email}' já pertence a outro usuário.`);
      return;
    }
    setUsers(prev => prev.map(user => user.id === updatedUser.id ? updatedUser : user));
  };
  const handleDeleteUser = (userId: number) => setUsers(prev => prev.filter(user => user.id !== userId));

  // Case Management
  const handleAddCase = (newCase: Omit<CaseData, 'id' | 'id2'>) => {
    if (cases.some(c => c.processoNumero.trim() === newCase.processoNumero.trim())) {
      alert(`Erro: O número de processo '${newCase.processoNumero}' já está cadastrado.`);
      return;
    }
    const newId = getNextCaseId();
    const newId2 = `MST${String(newId).padStart(5, '0')}`;

    const tramitationLog: TramitationEntry[] = [{
      fromUser: currentUser!.name,
      toUser: newCase.name,
      timestamp: new Date().toISOString(),
      deadline: newCase.prazoDeterminado || ''
    }];
    
    const finalNewCase: CaseData = {
        ...newCase,
        id: newId,
        id2: newId2,
        ownerName: 'Ms Tributário',
        coResponsibleName: newCase.name,
        tramitationLog: tramitationLog
    } as CaseData;

    setCases(prev => [finalNewCase, ...prev]);

    // Simulate email notification
    const emailRecipients = {
        to: 'Marcelo@mstributario.com.br',
        cc: 'Livia@mstributario.com.br'
    };
    alert(
        `Caso "${finalNewCase.processoNumero}" criado com sucesso!\n\n` +
        `(Simulação) Um e-mail de notificação sobre o novo caso seria enviado para:\n` +
        `Para: ${emailRecipients.to}\n` +
        `Cc: ${emailRecipients.cc}\n\n` +
        `Nota: O envio real de e-mails requer integração com um serviço de backend.`
    );
  };
 const handleUpdateCase = (updatedCase: CaseData) => {
    if (cases.some(c => c.id !== updatedCase.id && c.processoNumero.trim() === updatedCase.processoNumero.trim())) {
        alert(`Erro: O número de processo '${updatedCase.processoNumero}' já pertence a outro caso.`);
        return;
    }

    setCases(prev => prev.map(c => {
        if (c.id !== updatedCase.id) return c;

        // Tramitation logic: if assignee ('name') changes, log it.
        if (c.name !== updatedCase.name) {
            const newUser = users.find(u => u.name === updatedCase.name);
            const logEntry: TramitationEntry = {
                fromUser: currentUser!.name,
                toUser: updatedCase.name,
                timestamp: new Date().toISOString(),
                deadline: updatedCase.prazoDeterminado
            };
            return {
                ...updatedCase,
                email: newUser?.email || '',
                tramitationLog: [...(c.tramitationLog || []), logEntry],
                coResponsibleName: c.coResponsibleName || updatedCase.name
            };
        }
        return updatedCase; // No change in assignee
    }));
  };
  
  const handleUpdateMultipleCases = (updatedCases: CaseData[]) => {
    const updatedCaseMap = new Map(updatedCases.map(c => [c.id, c]));
    setCases(prevCases => prevCases.map(c => updatedCaseMap.get(c.id) || c));
  };
  
  const handleDeleteCase = (caseId: number) => setCases(prev => prev.filter(c => c.id !== caseId));
  const handleDeleteMultipleCases = (caseIds: number[]) => {
    setCases(prev => prev.filter(c => !caseIds.includes(c.id)));
  };

  const handleTramitateCase = (caseId: number, toUserName: string, deadline: string, attachmentFile?: File) => {
    if (attachmentFile && attachmentFile.size > MAX_FILE_SIZE_BYTES) {
        alert(`Erro: O arquivo é muito grande. O tamanho máximo permitido é de ${MAX_FILE_SIZE_MB}MB.`);
        return;
    }

    const processTramitation = (attachmentContent: string | null = null) => {
        setCases(prev => prev.map(c => {
            if (c.id === caseId) {
                const toUser = users.find(u => u.name === toUserName);
                if (!toUser) {
                    alert(`Erro: Usuário '${toUserName}' não encontrado para tramitação.`);
                    return c;
                }

                const logEntry: TramitationEntry = {
                    fromUser: currentUser!.name,
                    toUser: toUserName,
                    timestamp: new Date().toISOString(),
                    deadline: deadline,
                };
                
                const updatedCase: CaseData = {
                    ...c,
                    name: toUser.name,
                    email: toUser.email,
                    tramitationLog: [...(c.tramitationLog || []), logEntry],
                    coResponsibleName: c.coResponsibleName || toUser.name,
                };
                
                if (attachmentFile && attachmentContent) {
                    const newAttachment: Attachment = {
                        id: `${Date.now()}-${attachmentFile.name}`,
                        fileName: attachmentFile.name,
                        fileType: attachmentFile.type,
                        fileSize: attachmentFile.size,
                        content: attachmentContent,
                        uploadedBy: currentUser!.name,
                        timestamp: new Date().toISOString(),
                    };
                    updatedCase.attachments = [...(c.attachments || []), newAttachment];
                }

                return updatedCase;
            }
            return c;
        }));
    }

    if (attachmentFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) {
                alert('Erro ao ler o arquivo anexo.');
                return;
            }
            processTramitation(content);
        };
        reader.onerror = () => {
            alert('Ocorreu um erro ao ler o arquivo anexo.');
        };
        reader.readAsDataURL(attachmentFile);
    } else {
        processTramitation();
    }
  };

  const handleAddAttachment = useCallback((caseId: number, file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`Erro: O arquivo é muito grande. O tamanho máximo permitido é de ${MAX_FILE_SIZE_MB}MB.`);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) {
            alert('Erro ao ler o arquivo.');
            return;
        }

        const newAttachment: Attachment = {
            id: `${Date.now()}-${file.name}`,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            content: content,
            uploadedBy: currentUser!.name,
            timestamp: new Date().toISOString(),
        };

        setCases(prev => prev.map(c => {
            if (c.id === caseId) {
                return {
                    ...c,
                    attachments: [...(c.attachments || []), newAttachment]
                };
            }
            return c;
        }));
    };
    reader.onerror = () => {
        alert('Ocorreu um erro ao ler o arquivo.');
    };
    reader.readAsDataURL(file);
  }, [currentUser]);


  const handleImportCases = (newCases: Omit<CaseData, 'id' | 'id2'>[]) => {
    const existingProcessNumbers = new Set(cases.map(c => c.processoNumero.trim()));
    const importedProcessNumbersInFile = new Set<string>();
    
    const successfulImports: CaseData[] = [];
    const duplicatesInFile: string[] = [];
    const duplicatesInSystem:string[] = [];

    for (const importedCase of newCases) {
        const trimmedProcessoNumero = importedCase.processoNumero?.trim();
        if (!trimmedProcessoNumero) continue;

        if (existingProcessNumbers.has(trimmedProcessoNumero)) {
            duplicatesInSystem.push(trimmedProcessoNumero);
            continue;
        }

        if (importedProcessNumbersInFile.has(trimmedProcessoNumero)) {
            duplicatesInFile.push(trimmedProcessoNumero);
            continue;
        }
        
        importedProcessNumbersInFile.add(trimmedProcessoNumero);
        const newId = getNextCaseId();
        const newId2 = `MST${String(newId).padStart(5, '0')}`;
        
        const assigneeName = importedCase.name; 
        const assigneeUser = users.find(u => u.name.trim().toLowerCase() === assigneeName?.trim().toLowerCase());
        
        const tramitationLog: TramitationEntry[] = [{
            fromUser: 'Sistema (Importação)',
            toUser: assigneeName,
            timestamp: new Date().toISOString(),
            deadline: importedCase.prazoDeterminado || ''
        }];

        const finalCase: CaseData = {
          ...importedCase,
          id: newId,
          id2: newId2,
          ownerName: 'Ms Tributário',
          name: assigneeUser?.name || assigneeName,
          email: assigneeUser?.email || '',
          coResponsibleName: assigneeUser?.name || assigneeName,
          tramitationLog: tramitationLog,
        } as CaseData;

        successfulImports.push(finalCase);
    }
    
    setCases(prev => [...prev, ...successfulImports]);
    
    let report = `Relatório de Importação:\n- ${successfulImports.length} caso(s) importado(s) com sucesso.\n`;
    if (duplicatesInSystem.length > 0) {
        report += `\nOs seguintes processos já existiam no sistema e não foram importados:\n- ${duplicatesInSystem.join('\n- ')}\n`;
    }
    if (duplicatesInFile.length > 0) {
        report += `\nOs seguintes processos estavam duplicados no arquivo e apenas a primeira ocorrência foi importada:\n- ${duplicatesInFile.join('\n- ')}\n`;
    }
    alert(report);
  };

  // Tribunal Management
  const handleAddTribunal = (newTribunal: Omit<Tribunal, 'id'>) => {
    if (tribunals.some(t => t.name.trim().toLowerCase() === newTribunal.name.trim().toLowerCase())) {
        alert(`Erro: O tribunal '${newTribunal.name}' já está cadastrado.`);
        return;
    }
    setTribunals(prev => [...prev, { ...newTribunal, id: getNextTribunalId() }].sort((a,b) => a.name.localeCompare(b.name)));
  };
  const handleUpdateTribunal = (updatedTribunal: Tribunal) => {
     if (tribunals.some(t => t.id !== updatedTribunal.id && t.name.trim().toLowerCase() === updatedTribunal.name.trim().toLowerCase())) {
        alert(`Erro: O nome de tribunal '${updatedTribunal.name}' já existe.`);
        return;
    }
    setTribunals(prev => prev.map(t => t.id === updatedTribunal.id ? updatedTribunal : t).sort((a,b) => a.name.localeCompare(b.name)));
  };
  const handleDeleteTribunal = (tribunalId: number) => setTribunals(prev => prev.filter(t => t.id !== tribunalId));

  // Fase Management
  const handleAddFase = (newFase: Omit<Fase, 'id'>) => {
    if (fases.some(f => f.name.trim().toLowerCase() === newFase.name.trim().toLowerCase())) {
        alert(`Erro: A fase '${newFase.name}' já está cadastrada.`);
        return;
    }
    setFases(prev => [...prev, { ...newFase, id: getNextFaseId() }].sort((a,b) => a.name.localeCompare(b.name)));
  };
  const handleUpdateFase = (updatedFase: Fase) => {
    if (fases.some(f => f.id !== updatedFase.id && f.name.trim().toLowerCase() === updatedFase.name.trim().toLowerCase())) {
        alert(`Erro: O nome de fase '${updatedFase.name}' já existe.`);
        return;
    }
    setFases(prev => prev.map(f => f.id === updatedFase.id ? updatedFase : f).sort((a,b) => a.name.localeCompare(b.name)));
  };
  const handleDeleteFase = (faseId: number) => setFases(prev => prev.filter(f => f.id !== faseId));

  // Status Management
  const handleAddStatus = (newStatus: Omit<Status, 'id'>) => {
    if (statuses.some(s => s.name.trim().toLowerCase() === newStatus.name.trim().toLowerCase())) {
        alert(`Erro: O status '${newStatus.name}' já está cadastrado.`);
        return;
    }
    setStatuses(prev => [...prev, { ...newStatus, id: getNextStatusId() }].sort((a,b) => a.name.localeCompare(b.name)));
  };
  const handleUpdateStatus = (updatedStatus: Status) => {
    if (statuses.some(s => s.id !== updatedStatus.id && s.name.trim().toLowerCase() === updatedStatus.name.trim().toLowerCase())) {
        alert(`Erro: O nome de status '${updatedStatus.name}' já existe.`);
        return;
    }
    setStatuses(prev => prev.map(s => s.id === updatedStatus.id ? updatedStatus : s).sort((a,b) => a.name.localeCompare(b.name)));
  };
  const handleDeleteStatus = (statusId: number) => setStatuses(prev => prev.filter(s => s.id !== statusId));
  
  const activeCases = useMemo(() => {
    return cases.filter(c => c.status !== ARCHIVED_STATUS_NAME);
  }, [cases]);

  const archivedCases = useMemo(() => {
    return cases.filter(c => c.status === ARCHIVED_STATUS_NAME);
  }, [cases]);


  const myCases = useMemo(() => {
    if (!currentUser) return [];
    let filtered = activeCases.filter(c => c.email === currentUser.email);
    
    if (myFilters.searchTerm) {
        const lowercasedFilter = myFilters.searchTerm.toLowerCase();
        filtered = filtered.filter(c => 
            Object.values(c).some(value => 
                String(value ?? '').toLowerCase().includes(lowercasedFilter)
            )
        );
    }
    
    if (myFilters.priority !== 'all') {
      filtered = filtered.filter(c => c.prioridade === myFilters.priority);
    }
    return filtered;
  }, [activeCases, currentUser, myFilters]);

  const allCases = useMemo(() => {
    if (currentUser?.permission !== 'adm') return [];
    let filtered = activeCases;
     if (globalFilters.searchTerm) {
        const lowercasedFilter = globalFilters.searchTerm.toLowerCase();
        filtered = filtered.filter(c => 
            Object.values(c).some(value => 
                String(value ?? '').toLowerCase().includes(lowercasedFilter)
            )
        );
    }
    if (globalFilters.priority !== 'all') {
      filtered = filtered.filter(c => c.prioridade === globalFilters.priority);
    }
    if (globalFilters.ownerName && globalFilters.ownerName !== 'all') {
        // This filter now targets the ASSIGNEE ('name'), not the owner.
        filtered = filtered.filter(c => c.name === globalFilters.ownerName);
    }
    return filtered;
  }, [activeCases, currentUser, globalFilters]);


  if (!currentUser) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        if (currentUser.permission !== 'adm') return null;
        return (
          <>
            <Dashboard cases={allCases} filters={globalFilters} onFilterChange={setGlobalFilters} users={users} />
            <div className="mt-8">
               <Spreadsheet 
                cases={allCases}
                onAddCase={handleAddCase}
                onUpdateCase={handleUpdateCase}
                onUpdateMultipleCases={handleUpdateMultipleCases}
                onDeleteCase={handleDeleteCase}
                onDeleteMultipleCases={handleDeleteMultipleCases}
                onImportCases={handleImportCases}
                onTramitateCase={handleTramitateCase}
                isAdminView={true}
                users={users}
                tribunals={tribunals}
                fases={fases}
                statuses={statuses}
              />
            </div>
            <GlobalKpiDashboard cases={allCases} users={users} />
          </>
        );
      case 'spreadsheet':
        return (
           <>
            <Dashboard cases={myCases} filters={myFilters} onFilterChange={setMyFilters} />
            <div className="mt-8">
              <Spreadsheet 
                cases={myCases}
                onAddCase={handleAddCase}
                onUpdateCase={handleUpdateCase}
                onUpdateMultipleCases={handleUpdateMultipleCases}
                onDeleteCase={handleDeleteCase}
                onDeleteMultipleCases={handleDeleteMultipleCases}
                onImportCases={handleImportCases}
                onTramitateCase={handleTramitateCase}
                isAdminView={false}
                users={users}
                tribunals={tribunals}
                fases={fases}
                statuses={statuses}
              />
            </div>
            <KpiDashboard cases={myCases} currentUser={currentUser} />
          </>
        );
      case 'kanban':
        const kanbanCases = currentUser.permission === 'adm' ? allCases : myCases;
        return (
          <>
            <div className="mb-4 flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <label htmlFor="kanban-group-by" className="text-sm font-medium text-gray-700">Agrupar por:</label>
                <select 
                    id="kanban-group-by"
                    value={kanbanGroupBy}
                    onChange={(e) => setKanbanGroupBy(e.target.value as KanbanGroupBy)}
                    className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                >
                    <option value="status">Status</option>
                    <option value="fases">Fase</option>
                    <option value="name">Atribuído a</option>
                    <option value="coResponsibleName">Co-responsável</option>
                    <option value="tribunal">Tribunal</option>
                </select>
            </div>
            <KanbanBoard
                cases={kanbanCases}
                statuses={statuses.filter(s => s.name !== ARCHIVED_STATUS_NAME)}
                fases={fases}
                tribunals={tribunals}
                users={users}
                onUpdateCase={handleUpdateCase}
                groupBy={kanbanGroupBy}
                onAddAttachment={handleAddAttachment}
                isAdminView={currentUser.permission === 'adm'}
            />
          </>
        );
      case 'calendar':
        const calendarCases = currentUser.permission === 'adm' ? allCases : myCases;
        return (
            <CalendarView 
                cases={calendarCases}
                onAddAttachment={handleAddAttachment}
                isAdminView={currentUser.permission === 'adm'}
            />
        );
      case 'history':
        if (currentUser.permission === 'adm') {
            return <TramitationHistory cases={cases} />;
        } else {
            const userInvolvedCases = cases.filter(c => 
                c.email === currentUser.email || // currently assigned
                (c.tramitationLog && c.tramitationLog.some(log => log.fromUser === currentUser.name || log.toUser === currentUser.name)) // was involved
            );
            return <TramitationHistory cases={userInvolvedCases} />;
        }
       case 'archived':
        if (currentUser.permission !== 'adm') return null;
        return (
          <>
            <Dashboard cases={archivedCases} filters={globalFilters} onFilterChange={setGlobalFilters} users={users} />
            <div className="mt-8">
               <Spreadsheet 
                cases={archivedCases}
                onAddCase={handleAddCase}
                onUpdateCase={handleUpdateCase}
                onUpdateMultipleCases={handleUpdateMultipleCases}
                onDeleteCase={handleDeleteCase}
                onDeleteMultipleCases={handleDeleteMultipleCases}
                onImportCases={handleImportCases}
                onTramitateCase={handleTramitateCase}
                isAdminView={true}
                users={users}
                tribunals={tribunals}
                fases={fases}
                statuses={statuses}
              />
            </div>
            <GlobalKpiDashboard cases={archivedCases} users={users} />
          </>
        );
      case 'admin':
         if (currentUser.permission !== 'adm') return null;
        return (
          <Admin 
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            tribunals={tribunals}
            onAddTribunal={handleAddTribunal}
            onUpdateTribunal={handleUpdateTribunal}
            onDeleteTribunal={handleDeleteTribunal}
            fases={fases}
            onAddFase={handleAddFase}
            onUpdateFase={handleUpdateFase}
            onDeleteFase={handleDeleteFase}
            statuses={statuses}
            onAddStatus={handleAddStatus}
            onUpdateStatus={handleUpdateStatus}
            onDeleteStatus={handleDeleteStatus}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800 font-sans">
      <Sidebar 
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;