import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  Upload,
  Download,
  Users,
  Tag,
  Target,
  Megaphone,
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Layers,
  ChevronDown,
  Sparkles,
  PhoneCall,
  UserCheck,
  Phone,
  MoreVertical,
  Check,
  CornerUpLeft,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Top Channel & Navigation
  const [selectedChannel, setSelectedChannel] = useState('WHATSAPP');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modals State
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Two-Step Broadcast Modals (Image 1 & Image 2)
  const [isStep1BroadcastModalOpen, setIsStep1BroadcastModalOpen] = useState(false);
  const [isStep2CampaignModalOpen, setIsStep2CampaignModalOpen] = useState(false);
  const [broadcastName, setBroadcastName] = useState('');
  const [step1Error, setStep1Error] = useState('');

  // Step 2 Campaign Form State
  const { data: profileRes } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/whatsapp/profile')
  });
  const profileData = profileRes?.data?.profile || null;
  const isWhatsAppConnected = profileData?.status === 'CONNECTED' && Boolean(profileData?.displayPhoneNumber);

  const [selectedNumber, setSelectedNumber] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('iglobal_welcome_msg');
  const [customMessageBody, setCustomMessageBody] = useState('नमस्ते {{name}}, IGlobal Tech में आपका स्वागत है! क्या हम आपकी कोई सहायता कर सकते हैं?');
  const [assignedCampaign, setAssignedCampaign] = useState('');
  const [isScheduleActive, setIsScheduleActive] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [isReattemptActive, setIsReattemptActive] = useState(true);
  const [isTestYourselfActive, setIsTestYourselfActive] = useState(false);

  // Single Contact Form
  const [singleContact, setSingleContact] = useState({
    name: '',
    phone: '',
    email: '',
    groupName: '',
    city: '',
    gender: 'Male',
    age: '',
    designation: '',
    tags: ''
  });

  // Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Excel Import Form
  const [importGroup, setImportGroup] = useState('');
  const [importTags, setImportTags] = useState('');
  const [importedFile, setImportedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);

  // 1. Fetch Real Groups
  const { data: groupsRes } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/contacts/groups')
  });
  const groups = (groupsRes?.data || []).filter((g) => g.name && g.name.trim() !== '');

  // 2. Fetch Wallet & Billing Overview for Real Wallet Balance
  const { data: billingRes } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: () => api.get('/billing/overview'),
    retry: false
  });
  const walletAmount = billingRes?.data?.wallet?.balance ?? 91.00;

  // 3. Fetch WhatsApp Templates
  const { data: templatesRes } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => api.get('/whatsapp/templates')
  });
  const availableTemplates = useMemo(() => {
    const rawTemplates = templatesRes?.data || [];
    if (rawTemplates.length === 0) {
      return [
        {
          name: 'iglobal_welcome_msg',
          category: 'MARKETING',
          rate: 0.72,
          header: '',
          body: 'Hello! Thank you for connecting with IGlobal Tech. We are here to assist you.',
          buttons: []
        },
        {
          name: 'hello_world',
          category: 'UTILITY',
          rate: 0.127,
          header: '',
          body: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API.',
          buttons: []
        }
      ];
    }
    return rawTemplates.map((t) => ({
      name: t.name,
      category: t.category || 'UTILITY',
      status: t.status || 'APPROVED',
      rate: t.category === 'MARKETING' ? 0.72 : 0.127,
      header: t.components?.find((c) => c.type === 'HEADER')?.text || '',
      body: t.components?.find((c) => c.type === 'BODY')?.text || 'Template Message Content',
      buttons: t.components?.find((c) => c.type === 'BUTTONS')?.buttons?.map((b) => b.text) || []
    }));
  }, [templatesRes]);

  const currentTemplate = useMemo(() => {
    return availableTemplates.find((t) => t.name === selectedTemplateName) || availableTemplates[0];
  }, [selectedTemplateName, availableTemplates]);

  // 4. Fetch Contacts with Group filter & search
  const { data: contactsRes, isLoading } = useQuery({
    queryKey: ['contacts', page, limit, searchQuery, selectedGroup],
    queryFn: () =>
      api.get('/contacts', {
        params: {
          page,
          limit,
          search: searchQuery || undefined,
          groupName: selectedGroup !== 'ALL' ? selectedGroup : undefined
        }
      })
  });

  const contacts = contactsRes?.data || [];
  const pagination = contactsRes?.meta || { total: contacts.length, page: 1, limit: 15, totalPages: 1 };

  // Calculate Estimation Cost
  const selectedCount = selectedContactIds.length > 0 ? selectedContactIds.length : contacts.length;
  const estimatedCost = (selectedCount * (currentTemplate?.rate || 0.127)).toFixed(2);

  // 5. Select All on Page / In Group
  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      setSelectedContactIds(contacts.map((c) => c._id));
    } else {
      setSelectedContactIds([]);
    }
  };

  const handleSelectAllInGroup = () => {
    setSelectedContactIds(contacts.map((c) => c._id));
    toast.success(`Selected all ${contacts.length} customers in ${selectedGroup === 'ALL' ? 'database' : selectedGroup}!`, 'Selected');
  };

  // 6. Create Single Contact
  const createContactMutation = useMutation({
    mutationFn: (data) =>
      api.post('/contacts', {
        ...data,
        tags: data.tags
          ? Array.isArray(data.tags)
            ? data.tags
            : data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : []
      }),
    onSuccess: () => {
      setIsSingleModalOpen(false);
      setSingleContact({
        name: '',
        phone: '',
        email: '',
        groupName: '',
        city: '',
        gender: 'Male',
        age: '',
        designation: '',
        tags: ''
      });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      toast.success('Customer added to your database!', 'Customer Created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Create Failed');
    }
  });

  // 7. Delete Contact
  const deleteContactMutation = useMutation({
    mutationFn: (id) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      toast.success('Customer removed from database.', 'Deleted');
    }
  });

  // 8. Create New Group
  const createGroupMutation = useMutation({
    mutationFn: ({ name, description }) => api.post('/contacts/groups', { name, description }),
    onSuccess: (res, vars) => {
      setIsCreateGroupModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      setSelectedGroup(vars.name);
      toast.success(`Group "${vars.name}" created successfully!`, 'Group Created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Group Error');
    }
  });

  // 9. Bulk Assign Group
  const bulkAssignGroupMutation = useMutation({
    mutationFn: ({ contactIds, groupName }) => api.post('/contacts/groups/assign', { contactIds, groupName }),
    onSuccess: (res, vars) => {
      setIsAssignGroupModalOpen(false);
      setSelectedContactIds([]);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      toast.success(`Moved ${vars.contactIds.length} customers to ${vars.groupName}!`, 'Group Assigned');
    }
  });

  // 10. Direct Excel/CSV Import
  const directImportMutation = useMutation({
    mutationFn: (data) => api.post('/contacts/import-direct', data),
    onSuccess: (res) => {
      setIsImportModalOpen(false);
      setImportedFile(null);
      setParsedRows([]);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      toast.success(res.data?.message || 'Customers imported successfully!', 'Import Complete');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Import Failed');
    }
  });

  // 11. Launch Broadcast Campaign Mutation (Step 2 Submit)
  const launchCampaignMutation = useMutation({
    mutationFn: (data) => api.post('/contacts/groups/broadcast', data),
    onSuccess: (res) => {
      setIsStep2CampaignModalOpen(false);
      setSelectedContactIds([]);
      toast.success(
        `Campaign "${broadcastName}" dispatched to ${selectedCount} customers via Meta Cloud API!`,
        'Broadcast Launched'
      );
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Campaign Launch Failed');
    }
  });

  // Handle Step 1 Save & Create
  const handleStep1SaveAndCreate = (e) => {
    e.preventDefault();
    if (!broadcastName.trim()) {
      setStep1Error('Please fill out this field.');
      return;
    }
    setStep1Error('');
    setIsStep1BroadcastModalOpen(false);
    setIsStep2CampaignModalOpen(true);
  };

  // 12. Handle Excel / CSV File Drop & Parse
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedFile(file);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(ws);
        
        const cleanedRows = [];
        for (const row of rawJson) {
          const phone = (row.mobile || row.Mobile || row['required Field (Mobile Number with Country Code)'] || row.phone || row.Phone || '').toString().replace(/\D/g, '');
          const name = (row.name || row.Name || row['required Field'] || row['Full Name'] || '').toString().trim();
          
          if (name === 'name' || phone === 'mobile' || name === 'required Field') continue;
          if (phone.length >= 10) {
            cleanedRows.push({
              name: name || 'Customer',
              mobile: phone,
              city: row.city || row.City || row.optional || '',
              gender: row.gender || row.Gender || row.optional_1 || '',
              age: row.age || row.Age || row.optional_2 || '',
              designation: row.designation || row.Designation || row.optional_3 || '',
              tags: row.tags || row.Tags || row.optional_4 || '',
              groupName: importGroup || ''
            });
          }
        }

        setParsedRows(cleanedRows);
        setIsParsing(false);
        toast.success(`Parsed ${cleanedRows.length} valid customer rows from ${file.name}!`, 'File Ready');
      } catch (err) {
        setIsParsing(false);
        toast.error('Failed to parse Excel file. Please use the official customers.xlsx template.', 'File Parse Error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 1-Click WhatsApp Live Chat
  const handleStartWhatsAppChat = (contact) => {
    toast.success(`Opening live WhatsApp chat with ${contact.name}...`, 'Live Inbox');
    navigate(`/inbox?contactId=${contact._id}&phone=${contact.phone}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 pb-24">
      {/* 1. TOP CHANNEL SWITCHER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedChannel('WHATSAPP')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
              selectedChannel === 'WHATSAPP'
                ? 'bg-white text-emerald-800 shadow-sm border border-emerald-500/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>WhatsApp ({profileData?.displayPhoneNumber || 'Not Connected'})</span>
          </button>

          <button
            onClick={() => setSelectedChannel('INSTAGRAM')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedChannel === 'INSTAGRAM'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>📷 Instagram</span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-black rounded-md">BETA</span>
          </button>

          <button
            onClick={() => setSelectedChannel('MESSENGER')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedChannel === 'MESSENGER'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>💬 Messenger</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md">BETA</span>
          </button>
        </div>

        {/* Total Customers Stats */}
        <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-500 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Total Database:</span>
          <span className="text-slate-900 font-mono font-black">{pagination.total.toLocaleString('en-IN')}</span>
          <span>Customers</span>
        </div>
      </div>

      {/* 2. GROUPS TABS BAR (Only user-created groups appear) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-2xl font-black transition shrink-0 border ${
            selectedGroup === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>All Customers</span>
          <span className="px-1.5 py-0.2 bg-slate-800 text-white text-[10px] font-mono rounded-full">
            {pagination.total}
          </span>
        </button>

        {groups.map((grp) => (
          <button
            key={grp.name}
            onClick={() => setSelectedGroup(grp.name)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl font-black transition shrink-0 border ${
              selectedGroup === grp.name
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <span>🏷️ {grp.name}</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full ${
              selectedGroup === grp.name ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {grp.count}
            </span>
          </button>
        ))}

        <button
          onClick={() => setIsCreateGroupModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>+ New Group</span>
        </button>
      </div>

      {/* 3. FILTER, SEARCH & CREATE BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <h2 className="text-base font-black text-slate-900">
            {selectedGroup === 'ALL' ? 'All Customers' : `Group: ${selectedGroup}`}
          </h2>
          {contacts.length > 0 && (
            <button
              onClick={handleSelectAllInGroup}
              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 underline"
            >
              Select All ({contacts.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Customers..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>All time</span>
          </div>

          {/* Send Bulk Message Trigger Button */}
          <button
            onClick={() => {
              if (selectedContactIds.length === 0 && contacts.length === 0) {
                toast.error('No customers available to broadcast.', 'Empty List');
                return;
              }
              setBroadcastName(selectedGroup !== 'ALL' ? `${selectedGroup} Campaign` : 'Festive WhatsApp Campaign');
              setIsStep1BroadcastModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Bulk Message</span>
          </button>

          {/* Create Contact Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center space-x-2"
            >
              <span>Create Contact</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isCreateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    setIsSingleModalOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Create Manually</span>
                </button>

                <button
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>Import CSV/Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. CUSTOMERS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                    onChange={handleSelectAllOnPage}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Name</th>
                <th className="p-4">Tags / Group</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <p className="text-sm font-bold">Loading customers database...</p>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-extrabold text-slate-800 text-sm">No Customers in {selectedGroup === 'ALL' ? 'Database' : selectedGroup}</p>
                      <p className="text-xs text-slate-500">
                        Import your official <span className="font-bold text-slate-700">customers.xlsx</span> Excel file or click "Create Manually" to start adding contacts.
                      </p>
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition inline-flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Import customers.xlsx</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact._id);
                  return (
                    <tr
                      key={contact._id}
                      className={`transition ${isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContactIds((prev) => [...prev, contact._id]);
                            } else {
                              setSelectedContactIds((prev) => prev.filter((id) => id !== contact._id));
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Name with Avatar and Meta Verified Icon */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {contact.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-slate-900">{contact.name}</span>
                              <span className="text-blue-500 text-[10px]" title="Meta WhatsApp Verified">♾️</span>
                            </div>
                            {contact.email && <p className="text-[10px] text-slate-400">{contact.email}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Tags / Group */}
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                          {contact.groupName ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black">
                              🏷️ {contact.groupName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                          {contact.tags?.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="p-4 font-mono font-bold text-slate-800">
                        +{contact.phone}
                      </td>

                      {/* Assigned To Avatar */}
                      <td className="p-4">
                        {contact.assignedTo ? (
                          <div className="flex items-center space-x-1.5">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center border border-emerald-300">
                              TS
                            </div>
                            <span className="text-[11px] text-slate-600 font-semibold">{contact.assignedTo.name || 'Agent'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Status (● Active) */}
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-[11px] text-slate-500">
                        {new Date(contact.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete customer ${contact.name}?`)) {
                              deleteContactMutation.mutate(contact._id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStartWhatsAppChat(contact)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition inline-flex items-center shadow-xs"
                          title="1-Click WhatsApp Live Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. FLOATING BULK ACTION BAR */}
      {selectedContactIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-800 flex items-center space-x-4 animate-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs font-black text-emerald-400">
            ✓ {selectedContactIds.length} Customers Selected
          </span>

          <div className="h-4 w-px bg-slate-700" />

          {/* Send Bulk Message Button */}
          <button
            onClick={() => {
              setBroadcastName(`${selectedGroup !== 'ALL' ? selectedGroup : 'Broadcast'} - ${selectedContactIds.length} Leads`);
              setIsStep1BroadcastModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>💬 Send Bulk WhatsApp Message</span>
          </button>

          {/* Move to Group in Bulk */}
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                bulkAssignGroupMutation.mutate({
                  contactIds: selectedContactIds,
                  groupName: e.target.value
                });
                e.target.value = '';
              }
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-2xl text-xs font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="" disabled>🏷️ Move to Group...</option>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>
                Move to {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSelectedContactIds([])}
            className="text-xs text-slate-400 hover:text-white transition px-2 py-1"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STEP 1 MODAL: CREATE BROADCAST (Exact Match to User's Image 1)        */}
      {/* ========================================================================= */}
      {isStep1BroadcastModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Create Broadcast</h3>
              <button
                onClick={() => setIsStep1BroadcastModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-400/80 hover:bg-slate-500 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStep1SaveAndCreate} className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 block">
                  Enter Broadcast Name*
                </label>
                <input
                  type="text"
                  value={broadcastName}
                  onChange={(e) => {
                    setBroadcastName(e.target.value);
                    if (e.target.value.trim()) setStep1Error('');
                  }}
                  placeholder="Enter Broadcast Name*"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                {step1Error && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-100 text-slate-700 text-[11px] px-3 py-1 rounded shadow-md border border-slate-300 pointer-events-none">
                    {step1Error}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  Save And Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. STEP 2 MODAL: CREATE CAMPAIGNS (Exact Match to User's Image 2)        */}
      {/* ========================================================================= */}
      {isStep2CampaignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Create Campaigns</h3>
              <button
                onClick={() => setIsStep2CampaignModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-400/80 hover:bg-slate-500 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOP 4 METRIC CARDS (Exact match to screenshot 2) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
                <p className="text-base font-black text-slate-900">1,000 <span className="text-[10px] font-bold text-emerald-600">/day</span></p>
                <p className="text-[11px] font-bold text-slate-400">Meta Approved Quota</p>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
                <p className="text-base font-black text-slate-900">{selectedCount}</p>
                <p className="text-[11px] font-bold text-slate-400">Selected Customers</p>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
                <p className="text-base font-black text-slate-900 font-mono">₹ {walletAmount.toFixed(0)}</p>
                <p className="text-[11px] font-bold text-slate-400">Wallet Balance</p>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
                <p className="text-base font-black text-emerald-700 font-mono">₹ {estimatedCost}</p>
                <p className="text-[11px] font-bold text-slate-400">Meta Charges</p>
              </div>
            </div>

            {/* FORM + WHATSAPP LIVE PREVIEW (2-Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Form: 7 Columns */}
              <div className="md:col-span-7 space-y-4 text-xs">
                {/* Campaign Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Campaign Name *</label>
                  <input
                    type="text"
                    value={broadcastName}
                    onChange={(e) => setBroadcastName(e.target.value)}
                    placeholder="Campaign name"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Select Number & Select Template */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Select Number *</label>
                    <select
                      value={selectedNumber}
                      onChange={(e) => setSelectedNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 truncate"
                    >
                      {isWhatsAppConnected ? (
                        <option value={profileData?.displayPhoneNumber}>
                          {profileData?.businessName || 'WhatsApp Business'} ({profileData?.displayPhoneNumber})
                        </option>
                      ) : (
                        <option value="">No WhatsApp Number Connected</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Select Template *</label>
                    <select
                      value={selectedTemplateName}
                      onChange={(e) => setSelectedTemplateName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 truncate"
                    >
                      {availableTemplates.map((t) => (
                        <option
                          key={t.name}
                          value={t.name}
                          disabled={t.status === 'PENDING'}
                        >
                          {t.name} ({t.category?.toLowerCase()}) {t.status === 'PENDING' ? '⏳ [Pending Meta Review]' : '🟢 [Approved]'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assign Campaign */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Assign Campaign</label>
                  <select
                    value={assignedCampaign}
                    onChange={(e) => setAssignedCampaign(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-500 focus:outline-hidden"
                  >
                    <option value="">Select Assign Campaign</option>
                    <option value="Lead Inbound Sequence">Lead Inbound Sequence</option>
                    <option value="Customer Retention 2026">Customer Retention 2026</option>
                  </select>
                </div>

                {/* ADVANCED OPTIONS WITH TOGGLES */}
                <div className="pt-2 space-y-3.5 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Advanced Options</p>

                  {/* 1. Schedule Date & Time */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Schedule Date & Time</p>
                      <p className="text-[11px] text-slate-400">Schedule your campaign to be sent at a specific date and time.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsScheduleActive(!isScheduleActive)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ${
                        isScheduleActive ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  {/* 2. Reattempt Failed Messages */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Reattempt Failed Messages</p>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        When a campaign fails for some customers, the system will retry by sending the same message template to those failed recipients after a defined time interval.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReattemptActive(!isReattemptActive)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${
                        isReattemptActive ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  {/* 3. Test Yourself */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Test Yourself</p>
                      <p className="text-[11px] text-slate-400">Send a test message before running the campaign</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTestYourselfActive(!isTestYourselfActive)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${
                        isTestYourselfActive ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: WhatsApp Mobile Phone Chat Mockup (5 Columns) */}
              <div className="md:col-span-5 bg-[#e5ddd5] rounded-3xl overflow-hidden border border-slate-300 shadow-inner flex flex-col justify-between min-h-[380px]">
                {/* Dark Green WhatsApp Header */}
                <div className="bg-[#075e54] text-white p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ChevronLeft className="w-4 h-4" />
                    <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs border border-white/20">
                      T
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none">The Kitchen Studio</p>
                      <p className="text-[9px] text-emerald-200">Business Account</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-white/80">
                    <Phone className="w-3.5 h-3.5" />
                    <MoreVertical className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Chat Wallpaper Content */}
                <div className="p-3.5 space-y-2">
                  <p className="text-[9px] text-slate-500 font-bold">
                    Template: <span className="text-slate-800">{currentTemplate.name}</span>
                  </p>

                  {/* WhatsApp Message Bubble */}
                  <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm space-y-2 max-w-[280px]">
                    {currentTemplate.header && (
                      <p className="text-xs font-black text-slate-900 leading-snug">{currentTemplate.header}</p>
                    )}
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {currentTemplate.body}
                    </p>
                    <p className="text-[9px] text-slate-400 text-right">
                      Apr 2, 2026
                    </p>

                    {/* Interactive Action Buttons */}
                    {currentTemplate.buttons?.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        {currentTemplate.buttons.map((btn) => (
                          <div
                            key={btn}
                            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-center text-[11px] font-extrabold text-blue-600 flex items-center justify-center space-x-1 border border-slate-200 cursor-pointer"
                          >
                            <CornerUpLeft className="w-3 h-3" />
                            <span>{btn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2 text-center text-[9px] text-slate-400">
                  🔒 End-to-end encrypted official Meta Cloud API
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Send Button */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  launchCampaignMutation.mutate({
                    groupName: selectedGroup !== 'ALL' ? selectedGroup : 'All Customers',
                    contactIds: selectedContactIds.length > 0 ? selectedContactIds : contacts.map((c) => c._id),
                    templateName: currentTemplate.name,
                    messageText: currentTemplate.body
                  });
                }}
                disabled={launchCampaignMutation.isPending}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {launchCampaignMutation.isPending
                    ? 'Launching Campaign via Meta API...'
                    : `Send 🚀`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. UPLOAD FILES / IMPORT EXCEL MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-end">
          <div className="w-full max-w-md bg-white min-h-screen p-6 space-y-5 shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Upload Files</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Official Template Green Notice */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                <p className="text-xs font-medium text-slate-700">Use our official data format to avoid import errors.</p>
                <a
                  href="/customers.xlsx"
                  download="customers.xlsx"
                  className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download template</span>
                </a>
              </div>

              {/* Group Name to Assign */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">Assign to Group</label>
                <input
                  type="text"
                  value={importGroup}
                  onChange={(e) => setImportGroup(e.target.value)}
                  placeholder="e.g. Group A, Retailers (or leave blank)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">Customer Tags</label>
                <input
                  type="text"
                  value={importTags}
                  onChange={(e) => setImportTags(e.target.value)}
                  placeholder="Add tags to imported customers..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20 space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-800">
                  {importedFile ? importedFile.name : 'Drag & drop your file'}
                </p>
                <p className="text-[11px] text-slate-400">Supports .xlsx and .xls</p>
                {parsedRows.length > 0 && (
                  <p className="text-xs font-extrabold text-emerald-700 pt-1">
                    ✓ {parsedRows.length} customers ready to import
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              {parsedRows.length > 0 ? (
                <button
                  onClick={() => {
                    directImportMutation.mutate({
                      contacts: parsedRows,
                      defaultGroup: importGroup || '',
                      defaultTags: importTags ? importTags.split(',').map((t) => t.trim()).filter(Boolean) : []
                    });
                  }}
                  disabled={directImportMutation.isPending}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 transition text-xs flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {directImportMutation.isPending
                      ? 'Importing into Database...'
                      : `Confirm & Import ${parsedRows.length} Customers`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 transition text-xs"
                >
                  Browse Files
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. CREATE NEW GROUP MODAL */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Create Customer Group</h3>
                  <p className="text-[11px] text-slate-500">Segment customers for targeted bulk WhatsApp marketing</p>
                </div>
              </div>
              <button onClick={() => setIsCreateGroupModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Group A, Festive VIPs, Tech Agency Owners"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Inbound leads from campaign"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={() => {
                  if (!newGroupName.trim()) {
                    toast.error('Group name is required.', 'Missing Name');
                    return;
                  }
                  createGroupMutation.mutate({ name: newGroupName, description: newGroupDesc });
                }}
                disabled={createGroupMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
              >
                <span>{createGroupMutation.isPending ? 'Creating Group...' : 'Save Customer Group'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. CREATE SINGLE CONTACT MANUALLY MODAL */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Create Customer Manually</h3>
                  <p className="text-[11px] text-slate-500">Add a new customer to your database</p>
                </div>
              </div>
              <button onClick={() => setIsSingleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    value={singleContact.name}
                    onChange={(e) => setSingleContact({ ...singleContact, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mobile (+Country Code) *</label>
                  <input
                    type="text"
                    value={singleContact.phone}
                    onChange={(e) => setSingleContact({ ...singleContact, phone: e.target.value })}
                    placeholder="e.g. 919818387397"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Assign to Group (Optional)</label>
                  <input
                    type="text"
                    value={singleContact.groupName}
                    onChange={(e) => setSingleContact({ ...singleContact, groupName: e.target.value })}
                    placeholder="e.g. Group A, Retailers"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={singleContact.email}
                    onChange={(e) => setSingleContact({ ...singleContact, email: e.target.value })}
                    placeholder="rahul@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!singleContact.name.trim() || !singleContact.phone.trim()) {
                    toast.error('Customer name and phone number are required.', 'Missing Fields');
                    return;
                  }
                  createContactMutation.mutate(singleContact);
                }}
                disabled={createContactMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
              >
                <span>{createContactMutation.isPending ? 'Saving Customer...' : 'Add Customer to Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
