import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
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
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedChannel, setSelectedChannel] = useState('WHATSAPP');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDirectMsgModalOpen, setIsDirectMsgModalOpen] = useState(false);
  const [activeContactForMsg, setActiveContactForMsg] = useState(null);
  const [directMsgText, setDirectMsgText] = useState('');

  // Single Contact Form State
  const [singleContact, setSingleContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: ''
  });

  // Import State
  const [importTab, setImportTab] = useState('FILE'); // 'FILE' or 'PASTE'
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);

  // 1. Fetch Contacts
  const { data: contactsRes, isLoading } = useQuery({
    queryKey: ['contacts', page, limit, searchQuery],
    queryFn: () =>
      api.get('/contacts', {
        params: { page, limit, search: searchQuery || undefined }
      })
  });

  const contacts = contactsRes?.data || [];
  const pagination = contactsRes?.meta || { total: 2223, page: 1, limit: 10, totalPages: 223 };

  // 2. Select All / Deselect
  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      const pageIds = contacts.map((c) => c._id);
      setSelectedContactIds(Array.from(new Set([...selectedContactIds, ...pageIds])));
    } else {
      setSelectedContactIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((item) => item !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  // 3. Create Single Contact Mutation
  const createSingleMutation = useMutation({
    mutationFn: (data) =>
      api.post('/contacts', {
        ...data,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      }),
    onSuccess: () => {
      setIsSingleModalOpen(false);
      setSingleContact({ name: '', phone: '', email: '', tags: '' });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert('Contact created successfully!');
    },
    onError: (err) => alert(err?.error?.message || err?.message || 'Error creating contact')
  });

  // 4. Batch Import Mutation
  const importMutation = useMutation({
    mutationFn: (contactsArray) => api.post('/contacts/import', { contacts: contactsArray }),
    onSuccess: (res) => {
      setIsImportModalOpen(false);
      setParsedRows([]);
      setCsvContent('');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert(`Import pipeline queued! Processed ${res.data?.totalQueued} contacts into database.`);
    },
    onError: (err) => alert(err?.error?.message || err?.message || 'Import error')
  });

  // 5. Send Direct Single Message Mutation
  const directMsgMutation = useMutation({
    mutationFn: ({ contactId, text }) =>
      api.post('/conversations/messages', { contactId, text }),
    onSuccess: () => {
      setIsDirectMsgModalOpen(false);
      setDirectMsgText('');
      alert('WhatsApp message sent directly via Meta Cloud API!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
    onError: (err) => alert(err?.error?.message || err?.message || 'Error sending message')
  });

  // 6. Bulk Action Mutation
  const bulkActionMutation = useMutation({
    mutationFn: ({ action, payload = {} }) =>
      api.post('/contacts/bulk', {
        contactIds: selectedContactIds,
        action,
        ...payload
      }),
    onSuccess: () => {
      setSelectedContactIds([]);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      alert('Bulk action executed successfully!');
    }
  });

  // Handle Excel / CSV File Drop
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const rows = json.map((r) => ({
          name: r.Name || r.name || r['Full Name'] || 'Customer',
          phone: (r.Phone || r.phone || r.Mobile || r.mobile || r.Number || '').toString().replace(/\D/g, ''),
          email: r.Email || r.email || '',
          tags: r.Tags || r.tags || r.Tag || ''
        })).filter((r) => r.phone.length >= 10);

        setParsedRows(rows);
      } catch (err) {
        alert('Error parsing file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 relative min-h-[calc(100vh-64px)] pb-24">
      {/* 1. Top Channel Tabs */}
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-200">
        <button
          onClick={() => setSelectedChannel('WHATSAPP')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-300"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={() => setSelectedChannel('INSTAGRAM')}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-100"
        >
          <span>Instagram</span>
          <span className="text-[9px] bg-rose-500 text-white px-1 rounded uppercase">BETA</span>
        </button>
        <button
          onClick={() => setSelectedChannel('MESSENGER')}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-100"
        >
          <span>Messenger</span>
          <span className="text-[9px] bg-blue-500 text-white px-1 rounded uppercase">BETA</span>
        </button>
      </div>

      {/* 2. Subheader & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">All Customers</h1>
          {selectedContactIds.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-bold text-emerald-600">{selectedContactIds.length} customers selected.</span>{' '}
              <button
                onClick={() => setSelectedContactIds(contacts.map((c) => c._id))}
                className="text-emerald-600 hover:underline font-semibold"
              >
                Select all {pagination.total} Customers.
              </button>{' '}
              <button
                onClick={() => setSelectedContactIds([])}
                className="text-slate-400 hover:underline ml-1"
              >
                Clear Selection
              </button>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs outline-none shadow-xs w-48 lg:w-64"
            />
          </div>

          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>All time</span>
          </button>

          {/* Import Modal Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel / CSV Import</span>
          </button>

          {/* Create Single Contact Button */}
          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* 3. High-Performance Contacts Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.length > 0 && selectedContactIds.length === contacts.length}
                    onChange={handleSelectAllOnPage}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="p-4">Name</th>
                <th className="p-4">Tags</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">Loading customers...</td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    No customers found. Click [Add Contact] or [Excel / CSV Import] to get started.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact._id);
                  const isFlagged = contact.status === 'FLAGGED';

                  return (
                    <tr
                      key={contact._id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(contact._id)}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{contact.name}</td>
                      <td className="p-4">
                        {contact.tags && contact.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-700 font-medium">+{contact.phone}</td>
                      <td className="p-4 text-slate-500">{contact.assignedTo?.name || '-'}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isFlagged ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isFlagged ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span>{contact.status === 'ACTIVE' ? 'Active' : 'Flagged'}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(contact.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2 text-slate-400">
                          {/* Direct WhatsApp Send */}
                          <button
                            onClick={() => {
                              setActiveContactForMsg(contact);
                              setIsDirectMsgModalOpen(true);
                            }}
                            className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Direct WhatsApp Send"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => {
                              const newName = prompt('Edit Name:', contact.name);
                              if (newName) {
                                api.put(`/contacts/${contact._id}`, { name: newName }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['contacts'] });
                                });
                              }
                            }}
                            className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this contact?')) {
                                api.delete(`/contacts/${contact._id}`).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['contacts'] });
                                });
                              }
                            }}
                            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate('/inbox')}
                            className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Open Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <span>
              {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Floating Multi-Select Action Bar */}
      {selectedContactIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4">
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{selectedContactIds.length} selected</span>
          </div>

          <button
            onClick={() => {
              const assignedUser = prompt('Assign to Agent:');
              if (assignedUser) bulkActionMutation.mutate({ action: 'ASSIGN_USER', payload: { assignedTo: assignedUser } });
            }}
            className="px-3 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1.5"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Assign User</span>
          </button>

          <button
            onClick={() => bulkActionMutation.mutate({ action: 'CONVERT_TO_LEAD', payload: { leadStage: 'NEW' } })}
            className="px-3 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1.5"
          >
            <Target className="w-3.5 h-3.5 text-purple-600" />
            <span>Convert to Lead</span>
          </button>

          <button
            onClick={() => {
              const tag = prompt('Tag to add:');
              if (tag) bulkActionMutation.mutate({ action: 'ADD_TAGS', payload: { tags: [tag] } });
            }}
            className="px-3 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1.5"
          >
            <Tag className="w-3.5 h-3.5 text-brand-600" />
            <span>Add Tags</span>
          </button>

          <button
            onClick={() => navigate('/campaigns')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Broadcast</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Delete ${selectedContactIds.length} selected contacts?`)) bulkActionMutation.mutate({ action: 'DELETE' });
            }}
            className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setSelectedContactIds([])}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. ADD SINGLE CONTACT MODAL */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
              <button onClick={() => setIsSingleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSingleMutation.mutate(singleContact);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Verma"
                  value={singleContact.name}
                  onChange={(e) => setSingleContact({ ...singleContact, name: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (with country code)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 919876543210"
                  value={singleContact.phone}
                  onChange={(e) => setSingleContact({ ...singleContact, phone: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="ramesh@gmail.com"
                  value={singleContact.email}
                  onChange={(e) => setSingleContact({ ...singleContact, email: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="VIP, Chimney Service, Hot Lead"
                  value={singleContact.tags}
                  onChange={(e) => setSingleContact({ ...singleContact, tags: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSingleMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  {createSingleMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EXCEL / CSV BULK IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Import Customers (Excel / CSV)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Import Tabs: File Upload vs Text Paste */}
            <div className="flex space-x-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setImportTab('FILE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${importTab === 'FILE' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}
              >
                Upload Excel / CSV File
              </button>
              <button
                onClick={() => setImportTab('PASTE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${importTab === 'PASTE' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}
              >
                Paste Number List
              </button>
            </div>

            {importTab === 'FILE' ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-brand-500 transition bg-slate-50/50">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Choose .xlsx, .xls or .csv file</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Columns detected: Name, Phone/Mobile, Email, Tags</p>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="mt-3 text-xs block mx-auto file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                {parsedRows.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold flex justify-between items-center">
                    <span>{parsedRows.length} valid contacts loaded from file!</span>
                    <button
                      onClick={() => importMutation.mutate(parsedRows)}
                      disabled={importMutation.isPending}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                    >
                      {importMutation.isPending ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Format: <code className="bg-slate-100 px-1 py-0.5 rounded">Name, Phone, Email, Tag</code>
                </p>
                <textarea
                  rows="5"
                  placeholder="Ramesh Kumar, 919876543210, ramesh@gmail.com, VIP Customer&#10;Sunita Rao, 919822334455, sunita@yahoo.com, Chimney Service"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 outline-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const lines = csvContent.trim().split('\n');
                      const rows = lines.map((line) => {
                        const parts = line.split(',');
                        return {
                          name: parts[0]?.trim() || 'Customer',
                          phone: parts[1]?.trim() || '',
                          email: parts[2]?.trim() || '',
                          tags: parts[3]?.trim() ? [parts[3].trim()] : []
                        };
                      });
                      importMutation.mutate(rows);
                    }}
                    disabled={importMutation.isPending || !csvContent.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    {importMutation.isPending ? 'Importing...' : 'Start Import Pipeline'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. DIRECT WHATSAPP MESSAGE DISPATCH MODAL */}
      {isDirectMsgModalOpen && activeContactForMsg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Send WhatsApp Message</h3>
              <button onClick={() => setIsDirectMsgModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Sending directly to <span className="font-bold text-slate-800">{activeContactForMsg.name} (+{activeContactForMsg.phone})</span> via Meta Cloud API.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                directMsgMutation.mutate({
                  contactId: activeContactForMsg._id,
                  text: directMsgText
                });
              }}
              className="space-y-3"
            >
              <textarea
                rows="4"
                required
                placeholder="Type your WhatsApp message here..."
                value={directMsgText}
                onChange={(e) => setDirectMsgText(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-emerald-700 font-semibold">Cost: ₹0.40 (Deducted from wallet)</span>
                <button
                  type="submit"
                  disabled={directMsgMutation.isPending || !directMsgText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  {directMsgMutation.isPending ? 'Sending...' : 'Send WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
