import React, { useState, useEffect } from 'react';
import type { User, Tribunal, Fase, Status } from '../types';

// --- MODAL COMPONENTS ---

const UserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    editingUser: User | null;
    name: string;
    setName: (name: string) => void;
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    permission: 'adm' | 'user';
    setPermission: (permission: 'adm' | 'user') => void;
    onGeneratePassword: () => void;
    generatedPasswordMsg: string;
}> = ({ isOpen, onClose, onSubmit, editingUser, name, setName, email, setEmail, password, setPassword, permission, setPermission, onGeneratePassword, generatedPasswordMsg }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-xl bg-white">
                <h3 className="text-2xl font-semibold mb-6">{editingUser ? 'Editar Usuário' : 'Adicionar Usuário'}</h3>
                <form onSubmit={onSubmit} className="space-y-6">
                    <div><label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">Nome</label><input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"/></div>
                    <div><label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">E-mail</label><input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"/></div>
                    <div>
                        <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">Senha</label>
                        <div className="flex items-center gap-2">
                             <input 
                                type="text" 
                                id="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder={editingUser ? 'Deixe em branco para não alterar' : "Padrão: 'admin'"}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                            />
                            {editingUser && (
                                <button 
                                    type="button" 
                                    onClick={onGeneratePassword} 
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors whitespace-nowrap"
                                >
                                    Resetar Senha
                                </button>
                            )}
                        </div>
                        {generatedPasswordMsg && <p className="text-sm text-green-700 mt-2">{generatedPasswordMsg}. A senha será atualizada ao salvar.</p>}
                    </div>
                    <div><label htmlFor="permission" className="text-sm font-medium text-gray-700 block mb-2">Permissão</label><select id="permission" value={permission} onChange={e => setPermission(e.target.value as 'adm' | 'user')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"><option value="user">Usuário</option><option value="adm">Administrador</option></select></div>
                    <div className="flex items-center justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">{editingUser ? 'Salvar Alterações' : 'Adicionar Usuário'}</button></div>
                </form>
            </div>
        </div>
    );
};

const ItemModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    editingItem: {id: number; name: string} | null;
    name: string;
    setName: (name: string) => void;
    title: string;
    addLabel: string;
    fieldLabel: string;
}> = ({ isOpen, onClose, onSubmit, editingItem, name, setName, title, addLabel, fieldLabel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-xl bg-white">
                <h3 className="text-2xl font-semibold mb-6">{editingItem ? `Editar ${title.slice(0, -1)}` : addLabel}</h3>
                <form onSubmit={onSubmit} className="space-y-6">
                    <div><label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">{fieldLabel}</label><input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"/></div>
                    <div className="flex items-center justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">{editingItem ? 'Salvar Alterações' : addLabel}</button></div>
                </form>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    title: string;
}> = ({ isOpen, onClose, onConfirm, itemName, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-md shadow-lg rounded-xl bg-white">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100"><svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mt-5">{title}</h3>
                    <div className="mt-2 px-7 py-3"><p className="text-sm text-gray-500">Tem certeza que deseja excluir <strong>{itemName}</strong>? Esta ação não pode ser desfeita.</p></div>
                    <div className="flex justify-center gap-4 mt-4"><button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-900 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button><button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">Excluir</button></div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN ADMIN COMPONENT ---

interface AdminProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
  tribunals: Tribunal[];
  onAddTribunal: (tribunal: Omit<Tribunal, 'id'>) => void;
  onUpdateTribunal: (tribunal: Tribunal) => void;
  onDeleteTribunal: (tribunalId: number) => void;
  fases: Fase[];
  onAddFase: (fase: Omit<Fase, 'id'>) => void;
  onUpdateFase: (fase: Fase) => void;
  onDeleteFase: (faseId: number) => void;
  statuses: Status[];
  onAddStatus: (status: Omit<Status, 'id'>) => void;
  onUpdateStatus: (status: Status) => void;
  onDeleteStatus: (statusId: number) => void;
}

const Admin: React.FC<AdminProps> = ({ 
    users, onAddUser, onUpdateUser, onDeleteUser,
    tribunals, onAddTribunal, onUpdateTribunal, onDeleteTribunal,
    fases, onAddFase, onUpdateFase, onDeleteFase,
    statuses, onAddStatus, onUpdateStatus, onDeleteStatus
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tribunals' | 'fases' | 'statuses'>('users');
  
  const TabButton: React.FC<{tabId: 'users' | 'tribunals' | 'fases' | 'statuses'; label: string}> = ({tabId, label}) => (
     <button
        onClick={() => setActiveTab(tabId)}
        className={`${
          activeTab === tabId
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
      >
        {label}
      </button>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <TabButton tabId="users" label="Usuários" />
            <TabButton tabId="tribunals" label="Tribunais" />
            <TabButton tabId="fases" label="Fases" />
            <TabButton tabId="statuses" label="Status" />
          </nav>
        </div>
        
        {activeTab === 'users' && <UserManagement users={users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />}
        {activeTab === 'tribunals' && <TribunalManagement tribunals={tribunals} onAddTribunal={onAddTribunal} onUpdateTribunal={onUpdateTribunal} onDeleteTribunal={onDeleteTribunal} />}
        {activeTab === 'fases' && <FaseManagement fases={fases} onAddFase={onAddFase} onUpdateFase={onUpdateFase} onDeleteFase={onDeleteFase} />}
        {activeTab === 'statuses' && <StatusManagement statuses={statuses} onAddStatus={onAddStatus} onUpdateStatus={onUpdateStatus} onDeleteStatus={onDeleteStatus} />}
    </div>
  );
};

// --- USER MANAGEMENT ---
const UserManagement: React.FC<Pick<AdminProps, 'users' | 'onAddUser' | 'onUpdateUser' | 'onDeleteUser'>> = 
({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permission, setPermission] = useState<'adm' | 'user'>('user');
  const [generatedPasswordMsg, setGeneratedPasswordMsg] = useState('');

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name);
      setEmail(editingUser.email);
      setPassword('');
      setPermission(editingUser.permission);
      setGeneratedPasswordMsg('');
      setIsModalOpen(true);
    }
  }, [editingUser]);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setPermission('user');
    setGeneratedPasswordMsg('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setGeneratedPasswordMsg('');
  };

  const handleGeneratePassword = () => {
    const newPassword = Math.random().toString(36).substring(2, 10);
    setPassword(newPassword);
    setGeneratedPasswordMsg(`Nova senha gerada: ${newPassword}`);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingUser) {
        const updatedUserData: User = { ...editingUser, name, email, permission };
        if (password) updatedUserData.password = password;
        onUpdateUser(updatedUserData);
    } else {
      onAddUser({ name, email, password: password || 'admin', permission });
    }
    closeModal();
  };

  const openDeleteConfirm = (user: User) => { setUserToDelete(user); setConfirmOpen(true); };
  const closeDeleteConfirm = () => { setUserToDelete(null); setConfirmOpen(false); };
  const handleConfirmDelete = () => { if (userToDelete) { onDeleteUser(userToDelete.id); closeDeleteConfirm(); } };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Usuários</h2><button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Adicionar Usuário</button></div>
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-100"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissão</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{users.map(user => (<tr key={user.id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.permission === 'adm' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{user.permission === 'adm' ? 'Admin' : 'Usuário'}</span></td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2"><button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-900 transition-colors">Editar</button><button onClick={() => openDeleteConfirm(user)} className="text-red-600 hover:text-red-900 transition-colors">Excluir</button></td></tr>))}</tbody></table></div>
      <UserModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingUser={editingUser}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        permission={permission}
        setPermission={setPermission}
        onGeneratePassword={handleGeneratePassword}
        generatedPasswordMsg={generatedPasswordMsg}
      />
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        itemName={userToDelete?.name}
        title="Excluir Usuário"
      />
    </div>
  );
}

// --- GENERIC LIST MANAGEMENT ---
const ListManagement: React.FC<{
    items: {id: number; name: string}[];
    onAddItem: (item: {name: string}) => void;
    onUpdateItem: (item: {id: number; name: string}) => void;
    onDeleteItem: (itemId: number) => void;
    title: string;
    addLabel: string;
    fieldLabel: string;
}> = ({ items, onAddItem, onUpdateItem, onDeleteItem, title, addLabel, fieldLabel }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<{id: number; name: string} | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: number; name: string} | null>(null);
    const [name, setName] = useState('');

    useEffect(() => { if (editingItem) { setName(editingItem.name); setIsModalOpen(true); } }, [editingItem]);
    const openAddModal = () => { setEditingItem(null); setName(''); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (editingItem) { onUpdateItem({ ...editingItem, name }); } else { onAddItem({ name }); } closeModal(); };
    const openDeleteConfirm = (item: {id: number; name: string}) => { setItemToDelete(item); setConfirmOpen(true); };
    const closeDeleteConfirm = () => { setItemToDelete(null); setConfirmOpen(false); };
    const handleConfirmDelete = () => { if (itemToDelete) { onDeleteItem(itemToDelete.id); closeDeleteConfirm(); } };
    
    return ( 
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de {title}</h2>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {addLabel}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => setEditingItem(item)} className="text-indigo-600 hover:text-indigo-900 transition-colors">Editar</button>
                    <button onClick={() => openDeleteConfirm(item)} className="text-red-600 hover:text-red-900 transition-colors">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ItemModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSubmit={handleSubmit}
            editingItem={editingItem}
            name={name}
            setName={setName}
            title={title}
            addLabel={addLabel}
            fieldLabel={fieldLabel}
        />
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={closeDeleteConfirm}
            onConfirm={handleConfirmDelete}
            itemName={itemToDelete?.name}
            title={`Excluir ${title.slice(0, -1)}`}
        />
      </div> 
    );
}

const TribunalManagement: React.FC<Pick<AdminProps, 'tribunals' | 'onAddTribunal' | 'onUpdateTribunal' | 'onDeleteTribunal'>> = (props) => (
    <ListManagement items={props.tribunals} onAddItem={props.onAddTribunal} onUpdateItem={props.onUpdateTribunal} onDeleteItem={props.onDeleteTribunal} title="Tribunais" addLabel="Adicionar Tribunal" fieldLabel="Nome do Tribunal"/>
);
const FaseManagement: React.FC<Pick<AdminProps, 'fases' | 'onAddFase' | 'onUpdateFase' | 'onDeleteFase'>> = (props) => (
    <ListManagement items={props.fases} onAddItem={props.onAddFase} onUpdateItem={props.onUpdateFase} onDeleteItem={props.onDeleteFase} title="Fases" addLabel="Adicionar Fase" fieldLabel="Nome da Fase"/>
);
const StatusManagement: React.FC<Pick<AdminProps, 'statuses' | 'onAddStatus' | 'onUpdateStatus' | 'onDeleteStatus'>> = (props) => (
    <ListManagement items={props.statuses} onAddItem={props.onAddStatus} onUpdateItem={props.onUpdateStatus} onDeleteItem={props.onDeleteStatus} title="Status" addLabel="Adicionar Status" fieldLabel="Nome do Status"/>
);

export default Admin;