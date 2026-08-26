import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Bot,
  Plus,
  Zap,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit2,
  Sparkles,
  MessageSquare,
  Target,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Droplets,
  Wand2,
  RefreshCw,
  Copy,
  Layers,
  Smartphone,
  Phone,
  CornerDownRight,
  ExternalLink,
  Tag,
  Clock,
  UserCheck,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Play,
  Share2,
  Sliders,
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  ShoppingBag,
  Package,
  Layers2,
  Workflow,
  Send,
  HelpCircle,
  GripHorizontal,
  Smile,
  Code,
  Scissors
} from 'lucide-react';

export default function AutomationPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // View state: 'LIST' or 'CANVAS'
  const [currentView, setCurrentView] = useState('LIST');
  const [selectedChannel, setSelectedChannel] = useState('WHATSAPP');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [createDropdownMode, setCreateDropdownMode] = useState('MENU'); // 'MENU' or 'PROMPT_NAME'
  const [newAutomationName, setNewAutomationName] = useState('');
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);

  // CANVAS STATE
  const [chatbotName, setChatbotName] = useState('New Automation Flow');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('MESSAGE');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Dragging state for moving canvas nodes
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const dotPositionsRef = useRef({}); // Maps dotId -> {x, y} measured from canvas

  // LIVE WIRE CONNECTING STATE (Stretches arrow as you drag)
  const [connectingSource, setConnectingSource] = useState(null); // { nodeId, buttonId, startX, startY }
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const mouseMovedRef = useRef(false); // Tracks if mouse moved since mouseDown (drag vs click)

  // Canonical WhatsApp Connection Status
  const { data: statusRes, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/whatsapp/status')
  });
  const statusData = statusRes?.data || null;
  const isWhatsAppConnected = statusData?.connected === true;

  // 1. Fetch Real Chatbot Workflows from Database
  const { data: workflowsRes, isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ['automation-workflows'],
    queryFn: () => api.get('/automation'),
    enabled: Boolean(isWhatsAppConnected)
  });
  const workflows = workflowsRes?.data || [];

  // 2. Fetch Real WhatsApp Templates from Database
  const { data: templatesRes } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/whatsapp/templates'),
    enabled: Boolean(isWhatsAppConnected)
  });
  const templates = templatesRes?.data || [];

  // Clean Initial Start Trigger Node (No Hardcoded Dummy Data!)
  const createCleanInitialNodes = () => [
    {
      id: 'node_start_trigger',
      type: 'START_TRIGGER',
      title: 'Start trigger',
      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
      position: { x: 80, y: 120 },
      width: 290,
      config: {
        triggerMode: 'Template',
        templateId: '',
        templateName: '',
        headerTitle: '',
        bodyText: '',
        buttons: [
          { id: 'btn_1', text: 'Option 1', targetNodeId: null },
          { id: 'btn_2', text: 'Option 2', targetNodeId: null }
        ]
      }
    }
  ];

  const [flowNodes, setFlowNodes] = useState(createCleanInitialNodes());

  const [openVariableMenuNodeId, setOpenVariableMenuNodeId] = useState(null);
  const [openEmojiMenuNodeId, setOpenEmojiMenuNodeId] = useState(null);

  const insertVariableIntoNode = (nodeId, variableVal) => {
    setFlowNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const current = n.config?.bodyText || '';
        return {
          ...n,
          config: {
            ...n.config,
            bodyText: current ? `${current} ${variableVal}` : variableVal
          }
        };
      })
    );
    setOpenVariableMenuNodeId(null);
    toast.success(`Inserted ${variableVal}`, 'Variable Added');
  };

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/automation/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Chatbot status toggled successfully.', 'Status Updated');
    },
    onError: (err) => toast.error(err.message, 'Toggle Error')
  });

  // Delete Workflow Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/automation/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Chatbot workflow removed cleanly.', 'Deleted');
    },
    onError: (err) => toast.error(err.message, 'Delete Error')
  });

  // Save Canvas Workflow Mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      const loadId = toast.loading('Saving chatbot workflow to Meta Cloud API...', 'Saving Flow');
      try {
        const triggerNode = flowNodes.find((n) => n.type === 'START_TRIGGER') || flowNodes[0];
        const triggerMode = triggerNode?.config?.triggerMode;
        const isAnyMessage = triggerMode === 'Any Message' || triggerMode === 'Any' || triggerMode === 'All';
        const isTemplate = triggerMode === 'Template';

        const payload = {
          name: chatbotName,
          channel: selectedChannel,
          type: 'AUTOMATION',
          triggerType: isAnyMessage ? 'ANY_MESSAGE' : (isTemplate ? 'TEMPLATE' : 'KEYWORD'),
          triggerConfig: {
            templateId: triggerNode?.config?.templateId,
            templateName: triggerNode?.config?.templateName || 'custom_flow',
            keyword: isAnyMessage ? '*' : (triggerNode?.config?.keyword || 'hi, hello')
          },
          nodes: flowNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            config: n.config
          }))
        };

        const res = editingWorkflowId
          ? await api.put(`/automation/${editingWorkflowId}`, payload)
          : await api.post('/automation', payload);

        toast.dismiss(loadId);
        return res.data;
      } catch (err) {
        toast.dismiss(loadId);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      setCurrentView('LIST');
      setEditingWorkflowId(null);
      toast.success('Chatbot workflow saved and active on Meta Cloud API!', 'Workflow Live');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Save Error');
    }
  });

  // 1. Move Node Drag Handlers
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    const node = flowNodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
  };

  // 2. Start Wire Connection from Output Dot (MouseDown on green + dot)
  const handleStartConnection = (e, nodeId, buttonId, startX, startY) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canvasRef.current) return;
    mouseMovedRef.current = false; // Reset move tracking on new connection start

    const rect = canvasRef.current.getBoundingClientRect();
    setConnectingSource({
      nodeId,
      buttonId,
      startX,
      startY
    });
    setCurrentMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // 3. Connect to Target Node
  const handleConnectToTargetNode = (targetNodeId) => {
    if (!connectingSource) return;
    if (connectingSource.nodeId === targetNodeId) {
      toast.warning('Cannot connect a message to itself.', 'Invalid Connection');
      setConnectingSource(null);
      return;
    }

    const { nodeId, buttonId } = connectingSource;

    setFlowNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node;

        if (node.type === 'START_TRIGGER') {
          return {
            ...node,
            config: {
              ...node.config,
              targetNodeId,
              buttons: [{ id: 'trigger_out', text: 'Start', targetNodeId }]
            }
          };
        }

        if (node.type === 'LIST_MESSAGE') {
          // Ensure every item has a stable id before matching
          const updatedItems = (node.config?.items || []).map((item, idx) => {
            const stableId = item.id || `opt_${idx}_${node.id}`;
            // Match by stable id OR by original item.id
            if (stableId === buttonId || item.id === buttonId) {
              return { ...item, id: stableId, targetNodeId };
            }
            return { ...item, id: stableId }; // Ensure id is always set
          });
          return { ...node, config: { ...node.config, items: updatedItems } };
        }

        if (node.type === 'BUTTON_MESSAGE') {
          // Ensure every button has a stable id before matching
          const updatedButtons = (node.config?.buttons || []).map((b, idx) => {
            const stableId = b.id || `btn_${idx}_${node.id}`;
            // Match ONLY by stable id — avoid index-based false matches
            if (stableId === buttonId || b.id === buttonId) {
              return { ...b, id: stableId, targetNodeId };
            }
            return { ...b, id: stableId }; // Ensure id is always set
          });
          return { ...node, config: { ...node.config, buttons: updatedButtons } };
        }

        // Generic sequential chaining for TEXT_MESSAGE, SEND_IMAGE, etc.
        return {
          ...node,
          config: {
            ...node.config,
            targetNodeId
          }
        };
      })
    );

    const targetNode = flowNodes.find((n) => n.id === targetNodeId);
    toast.success(`Connected to "${targetNode?.title || 'Next Message'}"!`, 'Wire Connected ✅');
    setConnectingSource(null);
  };

  // 4. Canvas Mouse Move (Follows cursor with live wire as you drag)
  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseCanvasX = e.clientX - rect.left;
    const mouseCanvasY = e.clientY - rect.top;

    if (connectingSource) {
      setCurrentMousePos({ x: mouseCanvasX, y: mouseCanvasY });
      mouseMovedRef.current = true; // Mark that mouse moved during connection drag
    }

    if (draggingNodeId) {
      const updatedX = Math.max(20, e.clientX - dragOffset.x);
      const updatedY = Math.max(40, e.clientY - dragOffset.y);

      setFlowNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, position: { x: updatedX, y: updatedY } } : n))
      );
    }
  };

  // 5. Canvas Mouse Up (Handles dropping wire onto a target node)
  const handleCanvasMouseUp = (e) => {
    if (connectingSource) {
      // Only try to auto-connect on drag (when mouse moved). On simple click, let the
      // subsequent onClick event on the target card handle the connection.
      if (mouseMovedRef.current) {
        if (!canvasRef.current) {
          setConnectingSource(null);
          return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;

        // Find node under mouse
        const targetNode = flowNodes.find((node) => {
          if (node.id === connectingSource.nodeId) return false;
          const nodeLeft = node.position.x - 30;
          const nodeRight = node.position.x + (node.width || 300) + 30;
          const nodeTop = node.position.y - 30;
          const nodeBottom = node.position.y + 450;
          return dropX >= nodeLeft && dropX <= nodeRight && dropY >= nodeTop && dropY <= nodeBottom;
        });

        if (targetNode) {
          handleConnectToTargetNode(targetNode.id);
          setConnectingSource(null);
        }
        // If no target found on drag, DON'T cancel — let user click a target
        mouseMovedRef.current = false;
      }
      // If mouse didn't move (click), keep connectingSource alive for target card onClick
    }

    setDraggingNodeId(null);
  };

  // 6. Cut / Disconnect Wire
  const handleCutWire = (sourceNodeId, itemId) => {
    setFlowNodes((prev) =>
      prev.map((node) => {
        if (node.id !== sourceNodeId) return node;

        if (node.type === 'START_TRIGGER') {
          return {
            ...node,
            config: {
              ...node.config,
              targetNodeId: null,
              buttons: []
            }
          };
        }

        if (node.type === 'LIST_MESSAGE') {
          const updatedItems = (node.config?.items || []).map((item) =>
            item.id === itemId ? { ...item, targetNodeId: null } : item
          );
          return { ...node, config: { ...node.config, items: updatedItems } };
        }

        if (node.type === 'BUTTON_MESSAGE') {
          const updatedButtons = (node.config?.buttons || []).map((b, idx) => {
            const btnId = b.id || `btn_${idx}_${node.id}`;
            return (btnId === itemId || b.id === itemId || String(idx) === String(itemId))
              ? { ...b, targetNodeId: null }
              : b;
          });
          return {
            ...node,
            config: {
              ...node.config,
              targetNodeId: itemId === 'node_out' ? null : node.config?.targetNodeId,
              buttons: updatedButtons
            }
          };
        }

        return node;
      })
    );
    toast.info('Wire connection cut! You can now re-connect it to any message.', 'Wire Cut');
  };

  const handleAutoLayout = () => {
    const startX = 80;
    const gapX = 360;
    setFlowNodes((prev) =>
      prev.map((node, i) => ({
        ...node,
        position: { x: startX + i * gapX, y: 140 + (i % 2) * 80 }
      }))
    );
    toast.info('Canvas nodes aligned neatly.', 'Auto Layout');
  };

  // Node Library Definitions (Matching Screenshot 1)
  const messageNodeDefinitions = [
    { type: 'BUTTON_MESSAGE', title: 'Button message', desc: 'Send an interactive message with up to 3 quick reply buttons', icon: MessageSquare },
    { type: 'LIST_MESSAGE', title: 'List message', desc: 'Present users with a scrollable list of options to choose', icon: Layers },
    { type: 'TEXT_MESSAGE', title: 'Text message', desc: 'Send a plain text message with dynamic customer variables', icon: MessageSquare },
    { type: 'TEMPLATE', title: 'Template', desc: 'Send a pre-approved WhatsApp message template', icon: FileText },
    { type: 'MEDIA_BUTTON', title: 'Media + Button', desc: 'Send an image, video or document with quick reply buttons', icon: ImageIcon }
  ];

  const handleAddNodeFromLibrary = (def) => {
    const newNodeId = `node_${def.type.toLowerCase()}_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: def.type === 'LIST_MESSAGE' ? 'LIST_MESSAGE' : def.type === 'BUTTON_MESSAGE' ? 'BUTTON_MESSAGE' : 'TEXT_MESSAGE',
      title: def.title,
      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
      position: { x: 450 + Math.random() * 60, y: 180 + Math.random() * 60 },
      width: 290,
      config: {
        bodyText: def.type === 'TEXT_MESSAGE' ? 'Enter message text...' : 'Please choose an option below:',
        charCount: '0/1024',
        buttonTitle: def.type === 'LIST_MESSAGE' ? 'Select Option' : undefined,
        buttons: def.type === 'BUTTON_MESSAGE' ? [{ id: `btn_${Date.now()}`, text: 'Option 1', targetNodeId: null }] : [],
        items: def.type === 'LIST_MESSAGE' ? [{ id: `opt_${Date.now()}`, title: 'Option 1', subtitle: 'Description (optional)', targetNodeId: null }] : []
      }
    };
    setFlowNodes((prev) => [...prev, newNode]);
    toast.success(`"${def.title}" added to canvas! Hover over the green dot to see "+" and drag to connect.`, 'Node Added');
  };

  const handleAddButtonToNode = (nodeId) => {
    setFlowNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node;

        if (node.type === 'START_TRIGGER' || node.type === 'BUTTON_MESSAGE') {
          const currentBtns = node.config?.buttons || [];
          if (currentBtns.length >= 3) {
            toast.warning('Maximum 3 buttons per WhatsApp node.', 'Limit Reached');
            return node;
          }
          const newBtn = {
            id: `btn_${Date.now()}`,
            text: `Option ${currentBtns.length + 1}`,
            targetNodeId: null
          };
          return {
            ...node,
            config: { ...node.config, buttons: [...currentBtns, newBtn] }
          };
        }

        if (node.type === 'LIST_MESSAGE') {
          const currentItems = node.config?.items || [];
          if (currentItems.length >= 10) {
            toast.warning('Maximum 10 options per List message.', 'Limit Reached');
            return node;
          }
          const newItem = {
            id: `opt_${Date.now()}`,
            title: `Option ${currentItems.length + 1}`,
            subtitle: 'Description (optional)',
            targetNodeId: null
          };
          return {
            ...node,
            config: { ...node.config, items: [...currentItems, newItem] }
          };
        }

        return node;
      })
    );
  };

  const handleRemoveNode = (nodeId) => {
    if (nodeId === 'node_start_trigger') {
      toast.warning('Start Trigger node cannot be removed.', 'Action Restricted');
      return;
    }
    setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
    toast.info('Node removed from canvas.', 'Deleted');
  };

  // Open Canvas for creating or editing
  const handleOpenBuilder = (wf = null) => {
    if (wf) {
      setEditingWorkflowId(wf._id);
      setChatbotName(wf.name || 'Custom Chatbot Flow');
      if (wf.nodes && wf.nodes.length > 0) {
        setFlowNodes(wf.nodes);
      } else {
        setFlowNodes(createCleanInitialNodes());
      }
    } else {
      setEditingWorkflowId(null);
      setChatbotName('New Automation Flow');
      setFlowNodes(createCleanInitialNodes());
    }
    setIsCreateDropdownOpen(false);
    setCurrentView('CANVAS');
  };

  // Preset Template Library Initializer
  const handleSelectPreset = (presetKey) => {
    const preset = PRESET_TEMPLATES[presetKey];
    if (preset) {
      setChatbotName(preset.name);
      setFlowNodes(JSON.parse(JSON.stringify(preset.nodes)));
      setEditingWorkflowId(null);
      toast.success(`Loaded "${preset.name}" preset flow onto canvas!`, 'Preset Applied');
    }
    setIsCreateDropdownOpen(false);
    setCurrentView('CANVAS');
  };

  // Helper: get real canvas-relative position of a green dot by querying DOM
  const getDotCanvasPos = (dotId) => {
    if (!canvasRef.current) return null;
    const el = canvasRef.current.querySelector(`[data-dot-id="${dotId}"]`);
    if (!el) return null;
    const dotRect = el.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    return {
      x: dotRect.left + dotRect.width / 2 - canvasRect.left,
      y: dotRect.top + dotRect.height / 2 - canvasRect.top
    };
  };

  // Calculate all active connections for rendering SVG lines
  const activeConnections = [];
  flowNodes.forEach((sourceNode) => {
    // 1. Direct Sequential Output Wire (for Text, Image, Start Trigger, etc.)
    if (sourceNode.type !== 'BUTTON_MESSAGE' && sourceNode.type !== 'LIST_MESSAGE') {
      const directTargetId = sourceNode.config?.targetNodeId || (sourceNode.type === 'START_TRIGGER' ? sourceNode.config?.buttons?.[0]?.targetNodeId : null);
      if (directTargetId) {
        const targetNode = flowNodes.find((n) => n.id === directTargetId);
        if (targetNode) {
          const dotId = `dot_out_${sourceNode.id}`;
          const domPos = getDotCanvasPos(dotId);
          const startX = domPos ? domPos.x : sourceNode.position.x + (sourceNode.width || 300);
          const startY = domPos ? domPos.y : sourceNode.position.y + (sourceNode.type === 'START_TRIGGER' ? 115 : 75);
          const endX = targetNode.position.x;
          const endY = targetNode.position.y + 75;
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          activeConnections.push({
            id: `${sourceNode.id}_direct_${targetNode.id}`,
            sourceNodeId: sourceNode.id,
            itemId: sourceNode.type === 'START_TRIGGER' ? 'trigger_out' : 'node_out',
            startX, startY, endX, endY, midX, midY
          });
        }
      }
    }

    // 2. BUTTON MESSAGE (Per-button individual branch wires — DOM measured)
    if (sourceNode.type === 'BUTTON_MESSAGE') {
      (sourceNode.config?.buttons || []).forEach((btn, idx) => {
        if (btn.targetNodeId) {
          const targetNode = flowNodes.find((n) => n.id === btn.targetNodeId);
          if (targetNode) {
            const btnItemId = btn.id || `btn_${idx}_${sourceNode.id}`;
            const dotId = `dot_btn_${btnItemId}`;
            const domPos = getDotCanvasPos(dotId);
            const startX = domPos ? domPos.x : sourceNode.position.x + (sourceNode.width || 300);
            const startY = domPos ? domPos.y : sourceNode.position.y + 245 + idx * 46;
            const endX = targetNode.position.x;
            const endY = targetNode.position.y + 75;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            activeConnections.push({
              id: `${sourceNode.id}_${btnItemId}_${targetNode.id}`,
              sourceNodeId: sourceNode.id,
              itemId: btnItemId,
              startX, startY, endX, endY, midX, midY
            });
          }
        }
      });
    }

    // 3. LIST MESSAGE (Per-item individual option wires — DOM measured)
    if (sourceNode.type === 'LIST_MESSAGE') {
      (sourceNode.config?.items || []).forEach((item, idx) => {
        if (item.targetNodeId) {
          const targetNode = flowNodes.find((n) => n.id === item.targetNodeId);
          if (targetNode) {
            const optItemId = item.id || `opt_${idx}_${sourceNode.id}`;
            const dotId = `dot_opt_${optItemId}`;
            const domPos = getDotCanvasPos(dotId);
            const startX = domPos ? domPos.x : sourceNode.position.x + (sourceNode.width || 300);
            const startY = domPos ? domPos.y : sourceNode.position.y + 295 + idx * 68;
            const endX = targetNode.position.x;
            const endY = targetNode.position.y + 75;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            activeConnections.push({
              id: `${sourceNode.id}_${optItemId}_${targetNode.id}`,
              sourceNodeId: sourceNode.id,
              itemId: optItemId,
              startX, startY, endX, endY, midX, midY
            });
          }
        }
      });
    }
  });

  // IF WHATSAPP IS NOT CONNECTED: SHOW CLEAN EXPLICIT CONNECT GATE (Section 24)
  if (!isLoadingStatus && !isWhatsAppConnected && selectedChannel === 'WHATSAPP') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50/70 p-4 md:p-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <Bot className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">WhatsApp Chatbots & Automation</h2>
            <p className="text-xs font-bold text-rose-600">No WhatsApp Business account connected.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
              Connect your WhatsApp Business account to activate automated WhatsApp chatbots, auto-replies, and drip journeys.
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start space-x-2.5 text-left text-xs font-semibold text-emerald-950">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Chatbot actions dispatch automated messages through your connected Meta Cloud API WhatsApp number.
            </p>
          </div>

          <a
            href="/integrations"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Connect WhatsApp Business</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 pb-24">
      {/* 1. SCREEN 1: CHATBOTS LIST VIEW */}
      {currentView === 'LIST' && (
        <div className="space-y-6">
          {/* Channel Tabs */}
          <div className="flex items-center space-x-3 text-xs font-extrabold border-b border-slate-200 pb-3">
            <button
              onClick={() => setSelectedChannel('WHATSAPP')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition ${
                selectedChannel === 'WHATSAPP'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setSelectedChannel('INSTAGRAM')}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition"
            >
              <span>Instagram</span>
              <span className="px-1.5 py-0.2 bg-purple-600 text-white rounded-md text-[9px] font-black">BETA</span>
            </button>

            <button
              onClick={() => setSelectedChannel('MESSENGER')}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition"
            >
              <span>Messenger</span>
              <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-md text-[9px] font-black">BETA</span>
            </button>
          </div>

          {/* Action Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Chatbots</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated 24/7 conversational flows, interactive buttons, and keyword triggers.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chatbots..."
                  className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-48 lg:w-60 shadow-xs"
                />
              </div>

              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600">
                Drips : <span className="text-slate-900">0/0</span>
              </div>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600">
                Chatbots : <span className="text-slate-900">{workflows.length}/{workflows.length}</span>
              </div>

              <button
                onClick={() => toast.info('Default fallback chatbot set.', 'Default Chatbot')}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition"
              >
                Set Default Chatbot
              </button>

              {/* Create Chatbot Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsCreateDropdownOpen(!isCreateDropdownOpen);
                    setCreateDropdownMode('MENU');
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  <span>Create Chatbot</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isCreateDropdownOpen && (
                  <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-30 text-xs font-bold divide-y divide-slate-50 animate-in fade-in zoom-in duration-150">
                    {createDropdownMode === 'MENU' ? (
                      <div className="space-y-1 py-1">
                        <button
                          onClick={() => setCreateDropdownMode('PROMPT_NAME')}
                          className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-slate-800 rounded-xl text-left transition group"
                        >
                          <div className="flex items-center space-x-2.5">
                            <Wand2 className="w-4 h-4 text-emerald-600" />
                            <span>Create Automation</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                        </button>

                        <button
                          onClick={() => {
                            setIsCreateDropdownOpen(false);
                            setIsLibraryModalOpen(true);
                          }}
                          className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-slate-800 rounded-xl text-left transition group"
                        >
                          <div className="flex items-center space-x-2.5">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                            <span>Create From Library</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 p-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <button
                            onClick={() => setCreateDropdownMode('MENU')}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                          >
                            &lt; Back
                          </button>
                          <span className="text-slate-900 font-extrabold">Create Automation</span>
                        </div>

                        <input
                          type="text"
                          value={newAutomationName}
                          onChange={(e) => setNewAutomationName(e.target.value)}
                          placeholder="Enter automation name"
                          autoFocus
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />

                        <button
                          onClick={() => {
                            if (!newAutomationName.trim()) {
                              toast.error('Automation name is required.', 'Name Missing');
                              return;
                            }
                            setChatbotName(newAutomationName.trim());
                            setNewAutomationName('');
                            setIsCreateDropdownOpen(false);
                            setFlowNodes(createCleanInitialNodes());
                            setCurrentView('CANVAS');
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition"
                        >
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABLE OF CHATBOTS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 w-10">
                      <input type="checkbox" className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    </th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Triggers</th>
                    <th className="p-4">Trigger Count</th>
                    <th className="p-4">Created By</th>
                    <th className="p-4">Created At</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {workflows.map((wf) => (
                    <tr key={wf._id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <input type="checkbox" className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      </td>
                      <td className="p-4 font-bold text-slate-900">{wf.name}</td>
                      <td className="p-4 text-slate-600 font-medium">{wf.type || 'Automation'}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {wf.triggerType === 'TEMPLATE' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                              TEMPLATE {wf.triggerConfig?.templateName || 'Template'}
                            </span>
                          ) : (wf.triggerType === 'ANY_MESSAGE' || wf.triggerType === 'CATCH_ALL' || wf.triggerConfig?.keyword === '*') ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                              🌐 ANY MESSAGE (CATCH ALL)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              KEYWORD {wf.triggerConfig?.keyword || 'HI, HELLO'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-800">{wf.executionCount || 0}</td>
                      <td className="p-4">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] border border-slate-300">
                          {wf.createdBy || 'WA'}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 text-[11px]">
                        {new Date(wf.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}, 2:01 pm
                      </td>
                      <td className="p-4">
                        <button onClick={() => toggleMutation.mutate(wf._id)} className="focus:outline-hidden">
                          {wf.isActive ? (
                            <span className="w-9 h-5 bg-emerald-500 rounded-full flex items-center p-0.5 transition justify-end shadow-xs">
                              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                            </span>
                          ) : (
                            <span className="w-9 h-5 bg-slate-300 rounded-full flex items-center p-0.5 transition justify-start shadow-xs">
                              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenBuilder(wf)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded-lg transition"
                          title="Open Canvas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete chatbot "${wf.name}"?`)) deleteMutation.mutate(wf._id);
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. SCREEN 2: VISUAL FLOW CANVAS (DRAGGABLE ARROWS & LIVE WIRE DRAWING) */}
      {currentView === 'CANVAS' && (
        <div className="space-y-4">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentView('LIST')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ← Back to List
              </button>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-bold">Chatbots / Build Chatbot :</span>
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={chatbotName}
                    onBlur={() => setIsEditingTitle(false)}
                    onChange={(e) => setChatbotName(e.target.value)}
                    autoFocus
                    className="px-2 py-0.5 bg-slate-50 border border-emerald-500 rounded-lg text-xs font-extrabold text-slate-900"
                  />
                ) : (
                  <div className="flex items-center space-x-1.5 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                    <h2 className="text-xs font-extrabold text-slate-900">{chatbotName}</h2>
                    <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  isSidebarOpen ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Node Library</span>
              </button>

              <button
                onClick={handleAutoLayout}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition"
              >
                Auto Layout
              </button>

              <button
                onClick={() => setCurrentView('LIST')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Discard
              </button>

              <button
                onClick={() => saveWorkflowMutation.mutate()}
                disabled={saveWorkflowMutation.isPending}
                className="px-5 py-1.5 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* MAIN 2D CANVAS WORKSPACE */}
          <div className="flex gap-4 items-start relative">
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onClick={(e) => {
                // If user clicks on empty canvas area (not on any node), cancel pending connection
                if (connectingSource && e.target === canvasRef.current) {
                  setConnectingSource(null);
                  mouseMovedRef.current = false;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && connectingSource) {
                  setConnectingSource(null);
                  mouseMovedRef.current = false;
                }
              }}
              tabIndex={0}
              className="flex-1 relative h-[820px] bg-[#FAFBFD] rounded-3xl border border-slate-200 overflow-hidden shadow-inner select-none outline-none"
            >
              {/* Dot Grid Background */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#94A3B8 1.3px, transparent 1.3px)',
                  backgroundSize: '24px 24px'
                }}
              />

              {/* DYNAMIC SVG BEZIER WIRE CONNECTIONS & LIVE DRAG LINE */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {/* 1. PERSISTENT CONNECTING DASHED GREEN LINES WITH CROSS 'x' MARKERS */}
                {activeConnections.map((conn) => {
                  // Smart bezier: if target is to the right, normal S-curve.
                  // If target is to the left or above, loop the curve around gracefully.
                  const dx = conn.endX - conn.startX;
                  const dy = conn.endY - conn.startY;
                  let cp1x, cp1y, cp2x, cp2y;
                  if (dx > 20) {
                    // Normal left-to-right: simple horizontal bezier
                    const offset = Math.max(80, dx * 0.5);
                    cp1x = conn.startX + offset;
                    cp1y = conn.startY;
                    cp2x = conn.endX - offset;
                    cp2y = conn.endY;
                  } else {
                    // Loopback: curve goes right, bends around, comes from left
                    const loopOut = 100 + Math.abs(dy) * 0.3;
                    cp1x = conn.startX + loopOut;
                    cp1y = conn.startY;
                    cp2x = conn.endX - loopOut;
                    cp2y = conn.endY;
                  }
                  const d = `M ${conn.startX} ${conn.startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${conn.endX} ${conn.endY}`;

                  return (
                    <g key={conn.id}>
                      <path d={d} fill="none" stroke="#65A30D" strokeWidth="2.5" strokeDasharray="5,4" />
                      {/* End Dots */}
                      <circle cx={conn.startX} cy={conn.startY} r="4" fill="#65A30D" />
                      <circle cx={conn.endX} cy={conn.endY} r="4.5" fill="#65A30D" />
                    </g>
                  );
                })}

                {/* 2. LIVE STRETCHING DASHED GREEN WIRE (When user drags from green + dot) */}
                {connectingSource && (
                  <g>
                    <path
                      d={`M ${connectingSource.startX} ${connectingSource.startY} C ${
                        connectingSource.startX + 60
                      } ${connectingSource.startY}, ${currentMousePos.x - 60} ${currentMousePos.y}, ${
                        currentMousePos.x
                      } ${currentMousePos.y}`}
                      fill="none"
                      stroke="#16A34A"
                      strokeWidth="3"
                      strokeDasharray="4,4"
                    />
                    <circle cx={connectingSource.startX} cy={connectingSource.startY} r="5" fill="#16A34A" />
                    <circle cx={currentMousePos.x} cy={currentMousePos.y} r="6" fill="#22C55E" />
                  </g>
                )}
              </svg>

              {/* RENDER INTERACTIVE CUT-WIRE BUTTONS (✕) ON EACH ACTIVE CONNECTION */}
              {activeConnections.map((conn) => (
                <button
                  key={`cut_${conn.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCutWire(conn.sourceNodeId, conn.itemId);
                  }}
                  className="absolute z-30 w-5 h-5 bg-white hover:bg-rose-500 hover:text-white text-slate-500 border border-slate-300 rounded-full shadow-md flex items-center justify-center text-[10px] font-black transition transform hover:scale-125 pointer-events-auto"
                  style={{
                    left: conn.midX - 10,
                    top: conn.midY - 10
                  }}
                  title="Click to cut / disconnect this wire"
                >
                  ✕
                </button>
              ))}

              {/* RENDER CANVAS NODES */}
              {flowNodes.map((node) => {
                const isConnecting = !!connectingSource;
                const isTrigger = node.type === 'START_TRIGGER';

                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      if (connectingSource) {
                        handleConnectToTargetNode(node.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`absolute w-[300px] bg-white rounded-2xl shadow-xl border overflow-visible z-20 transition-all ${
                      isConnecting && connectingSource.nodeId !== node.id
                        ? 'ring-4 ring-emerald-400 ring-offset-2 border-emerald-400 cursor-pointer'
                        : 'border-slate-200/90'
                    }`}
                    style={{ left: node.position.x, top: node.position.y }}
                  >
                    {/* LEFT INPUT CONNECTOR RING (Receiving Port) */}
                    {!isTrigger && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingSource) handleConnectToTargetNode(node.id);
                        }}
                        className={`absolute -left-2.5 top-[75px] w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md transition transform hover:scale-125 z-30 cursor-pointer ${
                          isConnecting ? 'bg-emerald-600 animate-ping' : 'bg-[#16A34A]'
                        }`}
                        title="Click to connect incoming wire here"
                      >
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}

                    {/* RIGHT OUTPUT CONNECTOR RING (For linear text/image messages only; Button/List messages use per-button dots) */}
                    {!isTrigger && node.type !== 'BUTTON_MESSAGE' && node.type !== 'LIST_MESSAGE' && (
                      <div
                        data-dot-id={`dot_out_${node.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!canvasRef.current) return;
                          const dotEl = e.currentTarget;
                          const dotRect = dotEl.getBoundingClientRect();
                          const canvasRect = canvasRef.current.getBoundingClientRect();
                          const dotX = dotRect.left + dotRect.width / 2 - canvasRect.left;
                          const dotY = dotRect.top + dotRect.height / 2 - canvasRect.top;
                          handleStartConnection(e, node.id, 'node_out', dotX, dotY);
                          toast.info('Now click or drag to any other message to connect them in sequence!', 'Connecting Next Message');
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!canvasRef.current) return;
                          const dotEl = e.currentTarget;
                          const dotRect = dotEl.getBoundingClientRect();
                          const canvasRect = canvasRef.current.getBoundingClientRect();
                          const dotX = dotRect.left + dotRect.width / 2 - canvasRect.left;
                          const dotY = dotRect.top + dotRect.height / 2 - canvasRect.top;
                          handleStartConnection(e, node.id, 'node_out', dotX, dotY);
                        }}
                        className="absolute -right-2.5 top-[75px] w-5 h-5 bg-[#16A34A] hover:bg-emerald-500 border-2 border-white rounded-full shadow-md flex items-center justify-center cursor-crosshair transition transform hover:scale-125 z-30 group"
                        title="Click or drag to connect next message (Sequential flow)"
                      >
                        <span className="text-white text-[10px] font-black opacity-0 group-hover:opacity-100 transition leading-none">+</span>
                        <span className="w-1.5 h-1.5 bg-white rounded-full group-hover:hidden" />
                      </div>
                    )}

                    {/* TOP ACTION BAR ICONS (Duplicate & Delete on top right) */}
                    {!isTrigger && (
                      <div className="absolute -top-6 right-1 flex items-center space-x-1.5 text-slate-400">
                        <button
                          onClick={() => {
                            const duplicateNode = {
                              ...JSON.parse(JSON.stringify(node)),
                              id: `node_${node.type.toLowerCase()}_${Date.now()}`,
                              position: { x: node.position.x + 40, y: node.position.y + 40 }
                            };
                            setFlowNodes((prev) => [...prev, duplicateNode]);
                            toast.success('Message duplicated!', 'Duplicated');
                          }}
                          className="hover:text-emerald-600 p-0.5 rounded transition"
                          title="Duplicate message"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveNode(node.id)}
                          className="hover:text-rose-600 p-0.5 rounded transition"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* NODE TOP HEADER BAR (Light Green Pill) */}
                    <div
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className="bg-[#DDF8E8] text-[#15803D] px-4 py-2 flex items-center justify-center font-bold text-xs tracking-wide rounded-t-2xl border-b border-emerald-200/60 cursor-grab active:cursor-grabbing relative"
                    >
                      <span>{node.title}</span>

                      {!isTrigger && (
                        <button
                          onClick={() => handleRemoveNode(node.id)}
                          className="absolute right-3 text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* NODE BODY CONTENT */}
                    <div className="p-3 space-y-2.5 text-xs text-slate-700">
                      {/* ========================================================= */}
                      {/* TYPE 1: START TRIGGER (Matching Screenshot 3) */}
                      {/* ========================================================= */}
                      {node.type === 'START_TRIGGER' && (
                        <div className="space-y-2.5 relative">
                          <select
                            value={node.config?.triggerMode || 'Text'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFlowNodes((prev) =>
                                prev.map((n) =>
                                  n.id === node.id
                                    ? {
                                        ...n,
                                        config: {
                                          ...n.config,
                                          triggerMode: val,
                                          keyword: val === 'Any Message' ? '*' : n.config?.keyword
                                        }
                                      }
                                    : n
                                )
                              );
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                          >
                            <option value="Any Message">🌐 Any Message (Catch-All / User kuchh bhi likhe)</option>
                            <option value="Keyword">Keyword (Specific words: hi, price, info)</option>
                            <option value="Text">Text</option>
                            <option value="Template">Template</option>
                          </select>

                          {/* Trigger Mode Info: Any Message */}
                          {(node.config?.triggerMode === 'Any Message' || node.config?.triggerMode === 'Any') ? (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5 text-purple-950">
                              <div className="flex items-center space-x-1.5 font-bold text-xs">
                                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                                <span>Trigger: Activate on Any Message</span>
                              </div>
                              <p className="text-[11px] text-purple-800 leading-relaxed">
                                Jab bhi koi customer WhatsApp par <strong>kuchh bhi type kare</strong>, ye chatbot activate ho jayega (Catch-All / Default Auto-Responder).
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Keyword Chips Container Box */}
                              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                                <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                                  {((node.config?.keyword || 'hi, Hi').split(',')).map((kw, kIdx) => {
                                    const cleanKw = kw.trim();
                                    if (!cleanKw) return null;
                                    return (
                                      <span
                                        key={kIdx}
                                        className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-bold transition"
                                      >
                                        <span>{cleanKw}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const remaining = (node.config?.keyword || '')
                                              .split(',')
                                              .map((k) => k.trim())
                                              .filter((k) => k && k !== cleanKw)
                                              .join(', ');
                                            setFlowNodes((prev) =>
                                              prev.map((n) =>
                                                n.id === node.id
                                                  ? { ...n, config: { ...n.config, keyword: remaining } }
                                                  : n
                                              )
                                            );
                                          }}
                                          className="text-slate-500 hover:text-rose-600 rounded-full"
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Add Keyword Dashed Input/Button */}
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  id={`input_add_kw_${node.id}`}
                                  placeholder="Type keyword..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.target.value.trim();
                                  if (!val) return;
                                  const currentKws = (node.config?.keyword || '')
                                    .split(',')
                                    .map((k) => k.trim())
                                    .filter(Boolean);
                                  if (!currentKws.includes(val)) {
                                    const updated = [...currentKws, val].join(', ');
                                    setFlowNodes((prev) =>
                                      prev.map((n) =>
                                        n.id === node.id
                                          ? { ...n, config: { ...n.config, keyword: updated } }
                                          : n
                                      )
                                    );
                                    e.target.value = '';
                                  }
                                }
                              }}
                              className="flex-1 px-2.5 py-1.5 border border-dashed border-emerald-500 rounded-xl text-xs font-semibold text-emerald-800 placeholder-emerald-600/70 bg-emerald-50/40 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inp = document.getElementById(`input_add_kw_${node.id}`);
                                if (inp && inp.value.trim()) {
                                  const val = inp.value.trim();
                                  const currentKws = (node.config?.keyword || '')
                                    .split(',')
                                    .map((k) => k.trim())
                                    .filter(Boolean);
                                  if (!currentKws.includes(val)) {
                                    const updated = [...currentKws, val].join(', ');
                                    setFlowNodes((prev) =>
                                      prev.map((n) =>
                                        n.id === node.id
                                          ? { ...n, config: { ...n.config, keyword: updated } }
                                          : n
                                      )
                                    );
                                    inp.value = '';
                                  }
                                }
                              }}
                              className="px-2.5 py-1.5 bg-[#16A34A] text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition"
                            >
                              Add your Keyword +
                            </button>
                          </div>

                          <div className="flex justify-end">
                            <span className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 cursor-pointer">
                              Add Condition+
                            </span>
                          </div>
                        </>
                      )}

                      {/* SINGLE RIGHT OUTPUT CONNECTOR DOT (Dashed curve directly to first message card!) */}
                      <div
                        data-dot-id={`dot_out_${node.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!canvasRef.current) return;
                          const dotEl = e.currentTarget;
                          const dotRect = dotEl.getBoundingClientRect();
                          const canvasRect = canvasRef.current.getBoundingClientRect();
                          const dotX = dotRect.left + dotRect.width / 2 - canvasRect.left;
                          const dotY = dotRect.top + dotRect.height / 2 - canvasRect.top;
                          handleStartConnection(e, node.id, 'trigger_out', dotX, dotY);
                          toast.info('Now click or drag to any message card to connect the arrow!', 'Connecting Arrow');
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!canvasRef.current) return;
                          const dotEl = e.currentTarget;
                          const dotRect = dotEl.getBoundingClientRect();
                          const canvasRect = canvasRef.current.getBoundingClientRect();
                          const dotX = dotRect.left + dotRect.width / 2 - canvasRect.left;
                          const dotY = dotRect.top + dotRect.height / 2 - canvasRect.top;
                          handleStartConnection(e, node.id, 'trigger_out', dotX, dotY);
                        }}
                        className="absolute -right-5 top-[105px] w-5 h-5 bg-[#16A34A] hover:bg-emerald-500 border-2 border-white rounded-full shadow-md flex items-center justify-center cursor-crosshair transition transform hover:scale-125 z-30 group"
                        title="Click or drag arrow to connect"
                      >
                        <span className="text-white text-[10px] font-black opacity-0 group-hover:opacity-100 transition leading-none">+</span>
                        <span className="w-1.5 h-1.5 bg-white rounded-full group-hover:hidden" />
                      </div>
                    </div>
                  )}

                      {/* ========================================================= */}
                      {/* TYPE 2: LIST MESSAGE (Matching Screenshot 2 & 3) */}
                      {/* ========================================================= */}
                      {node.type === 'LIST_MESSAGE' && (
                        <div className="space-y-2.5">
                          {/* Center + subheader */}
                          <div className="text-center text-slate-400 font-black text-sm -mt-1">+</div>

                          {/* Textarea Container Box with Emojis & Variable Buttons & Counter */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                            <textarea
                              id={`textarea_${node.id}`}
                              rows={4}
                              value={node.config?.bodyText || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFlowNodes((prev) =>
                                  prev.map((n) =>
                                    n.id === node.id ? { ...n, config: { ...n.config, bodyText: val } } : n
                                  )
                                );
                              }}
                              placeholder="Hello {{name}}\nWelcome to The Kitchen Studio\nIt's good to see you :)\n\nPlease choose from the below 👇"
                              className="w-full p-2.5 bg-transparent text-xs leading-relaxed focus:outline-hidden font-medium text-slate-800 resize-none"
                            />

                            {/* Toolbar: Emoji 😀, Variable { }, Character Counter */}
                            <div className="px-2.5 py-1.5 border-t border-slate-200/70 bg-white/70 flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center space-x-2">
                                {/* Emoji Quick Inserter */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenEmojiMenuNodeId(openEmojiMenuNodeId === node.id ? null : node.id);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition flex items-center space-x-1"
                                    title="Click to choose emojis"
                                  >
                                    <Smile className="w-3.5 h-3.5 text-slate-600" />
                                  </button>

                                  {openEmojiMenuNodeId === node.id && (
                                    <div className="absolute bottom-full left-0 mb-1 flex items-center space-x-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in">
                                      {['🙏', '👇', '❤️', '👋', '🔥', '✅', '⭐', '🎉', '😊', '📞'].map((em) => (
                                        <button
                                          key={em}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const current = node.config?.bodyText || '';
                                            setFlowNodes((prev) =>
                                              prev.map((n) =>
                                                n.id === node.id
                                                  ? { ...n, config: { ...n.config, bodyText: `${current} ${em}` } }
                                                  : n
                                              )
                                            );
                                            setOpenEmojiMenuNodeId(null);
                                          }}
                                          className="hover:scale-125 transition text-sm p-0.5"
                                        >
                                          {em}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Variable Dropdown / Inserter */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenVariableMenuNodeId(openVariableMenuNodeId === node.id ? null : node.id);
                                    }}
                                    className={`px-1.5 py-0.5 rounded-md transition font-black text-[11px] flex items-center space-x-0.5 ${
                                      openVariableMenuNodeId === node.id ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-slate-100 text-slate-700'
                                    }`}
                                    title="Click to insert Customer Variables"
                                  >
                                    <span>{'{ }'}</span>
                                    <span className="text-[10px] font-bold">Variables</span>
                                  </button>

                                  {openVariableMenuNodeId === node.id && (
                                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in">
                                      <div className="text-[9px] font-black uppercase text-slate-400 px-2 py-1 flex items-center justify-between">
                                        <span>Insert Variable:</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">1-Click</span>
                                      </div>
                                      {[
                                        { label: 'Customer Name', val: '{{name}}' },
                                        { label: 'First Name', val: '{{first_name}}' },
                                        { label: 'Phone Number', val: '{{phone}}' },
                                        { label: 'Current Date', val: '{{date}}' },
                                        { label: 'Current Time', val: '{{time}}' },
                                        { label: 'Company Name', val: '{{company}}' }
                                      ].map((v) => (
                                        <button
                                          key={v.val}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            insertVariableIntoNode(node.id, v.val);
                                          }}
                                          className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-between"
                                        >
                                          <span>{v.label}</span>
                                          <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1 py-0.5 rounded">{v.val}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Character Counter */}
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {(node.config?.bodyText || '').length}/1024
                              </span>
                            </div>

                            {/* 1-Click Quick Variable Pills Bar */}
                            <div className="flex flex-wrap items-center gap-1 p-2 bg-emerald-50/40 border-t border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-500 mr-0.5">Quick Add:</span>
                              {[
                                { label: 'Name', val: '{{name}}' },
                                { label: 'First Name', val: '{{first_name}}' },
                                { label: 'Phone', val: '{{phone}}' },
                                { label: 'Date', val: '{{date}}' },
                                { label: 'Time', val: '{{time}}' },
                                { label: 'Company', val: '{{company}}' }
                              ].map((v) => (
                                <button
                                  key={v.val}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertVariableIntoNode(node.id, v.val);
                                  }}
                                  className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-md text-[10px] font-bold shadow-2xs transition hover:scale-105 active:scale-95 flex items-center space-x-0.5"
                                  title={`Click to insert ${v.val}`}
                                >
                                  <span>+ {v.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Menu Bar (Solid Green Bar `#10B981` / `#059669`) */}
                          <div className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-2 rounded-xl flex items-center justify-between text-xs font-black shadow-xs transition">
                            <input
                              type="text"
                              value={node.config?.buttonTitle || 'Select Service'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFlowNodes((prev) =>
                                  prev.map((n) =>
                                    n.id === node.id ? { ...n, config: { ...n.config, buttonTitle: val } } : n
                                  )
                                );
                              }}
                              placeholder="Select Service"
                              className="font-black text-xs bg-transparent text-white focus:outline-hidden w-40 placeholder-white/80"
                            />
                            <span className="text-[10px] text-white/80 font-mono">
                              {(node.config?.buttonTitle || 'Select Service').length}/20
                            </span>
                          </div>

                          {/* List Items / Rows (Teal Cards `#0D9488`) */}
                          <div className="space-y-1.5 pt-0.5">
                            {(node.config?.items || []).map((item, itmIdx) => {
                              const itemId = item.id || `opt_${itmIdx}_${node.id}`;

                              const startConnFromItemDot = (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!canvasRef.current) return;
                                const dotEl = e.currentTarget;
                                const dotRect = dotEl.getBoundingClientRect();
                                const canvasRect = canvasRef.current.getBoundingClientRect();
                                const realDotX = dotRect.left + dotRect.width / 2 - canvasRect.left;
                                const realDotY = dotRect.top + dotRect.height / 2 - canvasRect.top;
                                handleStartConnection(e, node.id, itemId, realDotX, realDotY);
                              };

                              return (
                                <div
                                  key={itemId}
                                  className="relative flex flex-col p-2.5 bg-[#0D9488]/85 hover:bg-[#0D9488] text-white rounded-xl text-xs shadow-xs transition group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1.5 min-w-0">
                                      <GripHorizontal className="w-3.5 h-3.5 text-white/60 shrink-0 cursor-grab" />
                                      <input
                                        type="text"
                                        value={item.title}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setFlowNodes((prev) =>
                                            prev.map((n) => {
                                              if (n.id !== node.id) return n;
                                              const updatedItems = n.config.items.map((it) =>
                                                it.id === item.id ? { ...it, title: val } : it
                                              );
                                              return { ...n, config: { ...n.config, items: updatedItems } };
                                            })
                                          );
                                        }}
                                        placeholder="Raise a Request"
                                        className="font-bold text-xs bg-transparent text-white focus:outline-hidden w-36 truncate placeholder-white/70"
                                      />
                                    </div>

                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-[9px] text-white/70 font-mono">
                                        {(item.title || '').length}/24
                                      </span>
                                      {(node.config?.items || []).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFlowNodes((prev) =>
                                              prev.map((n) => {
                                                if (n.id !== node.id) return n;
                                                const filtered = n.config.items.filter((it) => it.id !== item.id);
                                                return { ...n, config: { ...n.config, items: filtered } };
                                              })
                                            );
                                          }}
                                          className="text-white/60 hover:text-white text-[10px] p-0.5"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-1 pl-5">
                                    <input
                                      type="text"
                                      value={item.subtitle || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFlowNodes((prev) =>
                                          prev.map((n) => {
                                            if (n.id !== node.id) return n;
                                            const updatedItems = n.config.items.map((it) =>
                                              it.id === item.id ? { ...it, subtitle: val } : it
                                            );
                                            return { ...n, config: { ...n.config, items: updatedItems } };
                                          })
                                        );
                                      }}
                                      placeholder="Description (optional)"
                                      className="text-[10px] text-white/80 bg-transparent focus:outline-hidden w-40 placeholder-white/50"
                                    />
                                    <span className="text-[9px] text-white/60 font-mono">
                                      {(item.subtitle || '').length}/60
                                    </span>
                                  </div>

                                  {/* Green Connector Dot — exact position via data-dot-id */}
                                  <div
                                    data-dot-id={`dot_opt_${itemId}`}
                                    onClick={(e) => {
                                      startConnFromItemDot(e);
                                      toast.info('Now click any message card to connect this option!', 'Connecting');
                                    }}
                                    onMouseDown={startConnFromItemDot}
                                    className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#16A34A] hover:bg-emerald-400 border-2 border-white rounded-full shadow-md flex items-center justify-center cursor-crosshair transition transform hover:scale-125 z-30 group"
                                    title={`Connect "${item.title || `Option ${itmIdx + 1}`}" to next message`}
                                  >
                                    <span className="text-white text-[10px] font-black opacity-0 group-hover:opacity-100 transition leading-none">+</span>
                                    <span className="w-1.5 h-1.5 bg-white rounded-full group-hover:hidden" />
                                  </div>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => handleAddButtonToNode(node.id)}
                              className="w-full py-2 border border-dashed border-emerald-500 hover:bg-emerald-50/60 rounded-xl text-center text-xs font-bold text-emerald-800 transition flex items-center justify-center space-x-1"
                            >
                              <span>+ Add List +</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TYPE 3: BUTTON MESSAGE (Matching Screenshot) */}
                      {/* ========================================================= */}
                      {(node.type === 'BUTTON_MESSAGE' || node.type === 'SEND_BUTTONS' || node.type === 'BUTTONS') && (
                        <div className="space-y-2.5">
                          {/* Center + subheader */}
                          <div className="text-center text-slate-400 font-black text-sm -mt-1">+</div>

                          {/* Textarea Container Box with Emojis & Variable Buttons & Counter */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                            <textarea
                              id={`textarea_${node.id}`}
                              rows={4}
                              value={node.config?.bodyText || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFlowNodes((prev) =>
                                  prev.map((n) =>
                                    n.id === node.id ? { ...n, config: { ...n.config, bodyText: val } } : n
                                  )
                                );
                              }}
                              placeholder="Add Content"
                              className="w-full p-2.5 bg-transparent text-xs leading-relaxed focus:outline-hidden font-medium text-slate-800 resize-none placeholder-slate-400"
                            />

                            {/* Toolbar: Emoji 😀, Variable { }, Character Counter */}
                            <div className="px-2.5 py-1.5 border-t border-slate-200/70 bg-white/70 flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center space-x-2">
                                {/* Emoji Quick Inserter */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenEmojiMenuNodeId(openEmojiMenuNodeId === node.id ? null : node.id);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition flex items-center space-x-1"
                                    title="Click to choose emojis"
                                  >
                                    <Smile className="w-3.5 h-3.5 text-slate-600" />
                                  </button>

                                  {openEmojiMenuNodeId === node.id && (
                                    <div className="absolute bottom-full left-0 mb-1 flex items-center space-x-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in">
                                      {['🙏', '👇', '❤️', '👋', '🔥', '✅', '⭐', '🎉', '😊', '📞'].map((em) => (
                                        <button
                                          key={em}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const current = node.config?.bodyText || '';
                                            setFlowNodes((prev) =>
                                              prev.map((n) =>
                                                n.id === node.id
                                                  ? { ...n, config: { ...n.config, bodyText: `${current} ${em}` } }
                                                  : n
                                              )
                                            );
                                            setOpenEmojiMenuNodeId(null);
                                          }}
                                          className="hover:scale-125 transition text-sm p-0.5"
                                        >
                                          {em}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Variable Dropdown / Inserter */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenVariableMenuNodeId(openVariableMenuNodeId === node.id ? null : node.id);
                                    }}
                                    className={`px-1.5 py-0.5 rounded-md transition font-black text-[11px] flex items-center space-x-0.5 ${
                                      openVariableMenuNodeId === node.id ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-slate-100 text-slate-700'
                                    }`}
                                    title="Click to insert Customer Variables"
                                  >
                                    <span>{'{ }'}</span>
                                    <span className="text-[10px] font-bold">Variables</span>
                                  </button>

                                  {openVariableMenuNodeId === node.id && (
                                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in">
                                      <div className="text-[9px] font-black uppercase text-slate-400 px-2 py-1 flex items-center justify-between">
                                        <span>Insert Variable:</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">1-Click</span>
                                      </div>
                                      {[
                                        { label: 'Customer Name', val: '{{name}}' },
                                        { label: 'First Name', val: '{{first_name}}' },
                                        { label: 'Phone Number', val: '{{phone}}' },
                                        { label: 'Current Date', val: '{{date}}' },
                                        { label: 'Current Time', val: '{{time}}' },
                                        { label: 'Company Name', val: '{{company}}' }
                                      ].map((v) => (
                                        <button
                                          key={v.val}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            insertVariableIntoNode(node.id, v.val);
                                          }}
                                          className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-between"
                                        >
                                          <span>{v.label}</span>
                                          <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1 py-0.5 rounded">{v.val}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Character Counter */}
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {(node.config?.bodyText || '').length}/1024
                              </span>
                            </div>

                            {/* 1-Click Quick Variable Pills Bar */}
                            <div className="flex flex-wrap items-center gap-1 p-2 bg-emerald-50/40 border-t border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-500 mr-0.5">Quick Add:</span>
                              {[
                                { label: 'Name', val: '{{name}}' },
                                { label: 'First Name', val: '{{first_name}}' },
                                { label: 'Phone', val: '{{phone}}' },
                                { label: 'Date', val: '{{date}}' },
                                { label: 'Time', val: '{{time}}' },
                                { label: 'Company', val: '{{company}}' }
                              ].map((v) => (
                                <button
                                  key={v.val}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertVariableIntoNode(node.id, v.val);
                                  }}
                                  className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-md text-[10px] font-bold shadow-2xs transition hover:scale-105 active:scale-95 flex items-center space-x-0.5"
                                  title={`Click to insert ${v.val}`}
                                >
                                  <span>+ {v.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Buttons List Container */}
                          <div className="space-y-2 pt-1">
                            {(node.config?.buttons || []).map((btn, btnIdx) => {
                              const btnId = btn.id || `btn_${btnIdx}_${node.id}`;

                              const startConnFromDot = (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!canvasRef.current) return;
                                const dotEl = e.currentTarget;
                                const dotRect = dotEl.getBoundingClientRect();
                                const canvasRect = canvasRef.current.getBoundingClientRect();
                                const realDotX = dotRect.left + dotRect.width / 2 - canvasRect.left;
                                const realDotY = dotRect.top + dotRect.height / 2 - canvasRect.top;
                                handleStartConnection(e, node.id, btnId, realDotX, realDotY);
                              };

                              return (
                                <div
                                  key={btnId}
                                  className="relative bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs transition"
                                >
                                  <div className="flex items-center space-x-2 flex-1">
                                    <span className="text-white/80 text-[10px] font-mono">{btnIdx + 1}.</span>
                                    <input
                                      type="text"
                                      value={btn.text || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFlowNodes((prev) =>
                                          prev.map((n) => {
                                            if (n.id !== node.id) return n;
                                            const updatedBtns = (n.config?.buttons || []).map((b, i) =>
                                              i === btnIdx ? { ...b, id: btnId, text: val } : b
                                            );
                                            return { ...n, config: { ...n.config, buttons: updatedBtns } };
                                          })
                                        );
                                      }}
                                      placeholder={`Enter button text...`}
                                      className="bg-transparent text-white font-bold text-xs focus:outline-hidden w-full placeholder-white/50"
                                    />
                                  </div>

                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[10px] text-white/70 font-mono">
                                      {(btn.text || '').length}/20
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFlowNodes((prev) =>
                                          prev.map((n) => {
                                            if (n.id !== node.id) return n;
                                            const updatedBtns = (n.config?.buttons || []).filter((_, i) => i !== btnIdx);
                                            return { ...n, config: { ...n.config, buttons: updatedBtns } };
                                          })
                                        );
                                      }}
                                      className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-md transition"
                                      title="Remove Button"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Button Right Output Connector Dot — exact position via data-dot-id */}
                                  <div
                                    data-dot-id={`dot_btn_${btnId}`}
                                    onClick={(e) => {
                                      startConnFromDot(e);
                                      toast.info(`Now click any message card to connect "${btn.text || `Button ${btnIdx + 1}`}"!`, 'Connecting Button');
                                    }}
                                    onMouseDown={startConnFromDot}
                                    className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#16A34A] hover:bg-emerald-400 border-2 border-white rounded-full shadow-md flex items-center justify-center cursor-crosshair transition transform hover:scale-125 z-30 group"
                                    title={`Connect "${btn.text || `Button ${btnIdx + 1}`}" to next message`}
                                  >
                                    <span className="text-white text-[10px] font-black opacity-0 group-hover:opacity-100 transition leading-none">+</span>
                                    <span className="w-1.5 h-1.5 bg-white rounded-full group-hover:hidden" />
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add Button + (Dashed Box matching screenshot) */}
                            {(node.config?.buttons || []).length < 3 && (
                              <div className="flex justify-center pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddButtonToNode(node.id)}
                                  className="px-4 py-2 border-2 border-dashed border-emerald-500 hover:bg-emerald-50/70 rounded-xl text-center text-xs font-bold text-emerald-800 transition flex items-center justify-center space-x-1 shadow-2xs hover:scale-105 active:scale-95"
                                >
                                  <span>Add Button +</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TYPE 4: TEXT MESSAGE (Matching Screenshot 2 & 3) */}
                      {/* ========================================================= */}
                      {node.type === 'TEXT_MESSAGE' && (
                        <div className="space-y-2 relative">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                            <textarea
                              rows={4}
                              value={node.config?.bodyText || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFlowNodes((prev) =>
                                  prev.map((n) =>
                                    n.id === node.id ? { ...n, config: { ...n.config, bodyText: val } } : n
                                  )
                                );
                              }}
                              placeholder="Respected Sir/Madam,\nTo proceed with your service request, please share your details."
                              className="w-full p-2.5 bg-transparent text-xs leading-relaxed focus:outline-hidden font-medium text-slate-800 resize-none"
                            />

                            {/* Toolbar: Emoji 😀, Variable { }, Character Counter */}
                            <div className="px-2.5 py-1.5 border-t border-slate-200/70 bg-white/70 flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center space-x-2">
                                {/* Emoji Quick Inserter */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenEmojiMenuNodeId(openEmojiMenuNodeId === node.id ? null : node.id);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition flex items-center space-x-1"
                                    title="Click to choose emojis"
                                  >
                                    <Smile className="w-3.5 h-3.5 text-slate-600" />
                                  </button>

                                  {openEmojiMenuNodeId === node.id && (
                                    <div className="absolute bottom-full left-0 mb-1 flex items-center space-x-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in">
                                      {['🙏', '👇', '❤️', '👋', '🔥', '✅', '⭐', '🎉', '😊', '📞'].map((em) => (
                                        <button
                                          key={em}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const current = node.config?.bodyText || '';
                                            setFlowNodes((prev) =>
                                              prev.map((n) =>
                                                n.id === node.id
                                                  ? { ...n, config: { ...n.config, bodyText: `${current} ${em}` } }
                                                  : n
                                              )
                                            );
                                            setOpenEmojiMenuNodeId(null);
                                          }}
                                          className="hover:scale-125 transition text-sm p-0.5"
                                        >
                                          {em}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Variable Dropdown / Inserter */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenVariableMenuNodeId(openVariableMenuNodeId === node.id ? null : node.id);
                                    }}
                                    className={`px-1.5 py-0.5 rounded-md transition font-black text-[11px] flex items-center space-x-0.5 ${
                                      openVariableMenuNodeId === node.id ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-slate-100 text-slate-700'
                                    }`}
                                    title="Click to insert Customer Variables"
                                  >
                                    <span>{'{ }'}</span>
                                    <span className="text-[10px] font-bold">Variables</span>
                                  </button>

                                  {openVariableMenuNodeId === node.id && (
                                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in">
                                      <div className="text-[9px] font-black uppercase text-slate-400 px-2 py-1 flex items-center justify-between">
                                        <span>Insert Variable:</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">1-Click</span>
                                      </div>
                                      {[
                                        { label: 'Customer Name', val: '{{name}}' },
                                        { label: 'First Name', val: '{{first_name}}' },
                                        { label: 'Phone Number', val: '{{phone}}' },
                                        { label: 'Current Date', val: '{{date}}' },
                                        { label: 'Current Time', val: '{{time}}' },
                                        { label: 'Company Name', val: '{{company}}' }
                                      ].map((v) => (
                                        <button
                                          key={v.val}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            insertVariableIntoNode(node.id, v.val);
                                          }}
                                          className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-between"
                                        >
                                          <span>{v.label}</span>
                                          <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1 py-0.5 rounded">{v.val}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className="text-[10px] text-slate-400 font-semibold">
                                {(node.config?.bodyText || '').length}/1024
                              </span>
                            </div>

                            {/* 1-Click Quick Variable Pills Bar */}
                            <div className="flex flex-wrap items-center gap-1 p-2 bg-emerald-50/40 border-t border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-500 mr-0.5">Quick Add:</span>
                              {[
                                { label: 'Name', val: '{{name}}' },
                                { label: 'First Name', val: '{{first_name}}' },
                                { label: 'Phone', val: '{{phone}}' },
                                { label: 'Date', val: '{{date}}' },
                                { label: 'Time', val: '{{time}}' },
                                { label: 'Company', val: '{{company}}' }
                              ].map((v) => (
                                <button
                                  key={v.val}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertVariableIntoNode(node.id, v.val);
                                  }}
                                  className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-md text-[10px] font-bold shadow-2xs transition hover:scale-105 active:scale-95 flex items-center space-x-0.5"
                                  title={`Click to insert ${v.val}`}
                                >
                                  <span>+ {v.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Layout & Save Controls */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xl">
                <button
                  onClick={handleAutoLayout}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto Layout</span>
                </button>

                <button
                  onClick={() => saveWorkflowMutation.mutate()}
                  disabled={saveWorkflowMutation.isPending}
                  className="px-6 py-2 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* RIGHT NODE LIBRARY SIDEBAR */}
            {isSidebarOpen && (
              <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-xl h-[820px] p-4 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
                <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Node Library</h3>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {messageNodeDefinitions.map((def) => {
                      const IconComponent = def.icon;
                      return (
                        <div
                          key={def.type}
                          onClick={() => handleAddNodeFromLibrary(def)}
                          className="p-3 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer group flex items-start space-x-3"
                        >
                          <div className="p-2 bg-white rounded-xl border border-slate-200 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                            <IconComponent className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                              {def.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mt-0.5">
                              {def.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-bold text-center border border-slate-100">
                    Click node to add on canvas
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SCREEN 3: CREATE FROM LIBRARY MODAL */}
      {isLibraryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Chatbot Template Library</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pre-configured conversational flows for WhatsApp SaaS.</p>
              </div>
              <button onClick={() => setIsLibraryModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: 'lib_kitchen',
                  title: 'The Kitchen Studio - Service & Rating Flow',
                  category: 'Interactive List & Feedback',
                  desc: 'Interactive List menu with Service Request, Feedback 1-5 rating, and Offers.',
                  icon: '🍳',
                  flowNodes: [
                    {
                      id: 'node_start',
                      type: 'START_TRIGGER',
                      title: 'Start trigger',
                      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
                      position: { x: 50, y: 150 },
                      config: {
                        triggerMode: 'Keyword',
                        keyword: 'hi, Hi, hello',
                        buttons: [{ id: 'btn_start', text: 'Start Flow', targetNodeId: 'node_list_services' }]
                      }
                    },
                    {
                      id: 'node_list_services',
                      type: 'LIST_MESSAGE',
                      title: 'List message',
                      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
                      position: { x: 380, y: 100 },
                      config: {
                        bodyText: 'Hello {{name}}\nWelcome to The Kitchen Studio\nIt\'s good to see you :)\n\nPlease choose from the below 👇',
                        buttonTitle: 'Select Service',
                        items: [
                          { id: 'btn_raise_request', title: 'Raise A Request', subtitle: 'Service request', targetNodeId: 'node_text_raise_request' },
                          { id: 'btn_service_feedback', title: 'Service Feedback', subtitle: 'Give feedback', targetNodeId: 'node_list_rating' },
                          { id: 'btn_exciting_offer', title: 'Exciting Offer', subtitle: 'Special discounts', targetNodeId: 'node_text_offers' }
                        ]
                      }
                    },
                    {
                      id: 'node_text_raise_request',
                      type: 'TEXT_MESSAGE',
                      title: 'Text message',
                      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
                      position: { x: 740, y: 50 },
                      config: {
                        bodyText: 'Respected Sir/Madam,\nTo proceed with your service request, please share your order/invoice number and issue details.'
                      }
                    },
                    {
                      id: 'node_text_offers',
                      type: 'TEXT_MESSAGE',
                      title: 'Text message',
                      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
                      position: { x: 740, y: 480 },
                      config: {
                        bodyText: 'For available offers, please get in touch with the SHOWROOM or visit our website!'
                      }
                    },
                    {
                      id: 'node_list_rating',
                      type: 'LIST_MESSAGE',
                      title: 'List message',
                      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
                      position: { x: 740, y: 220 },
                      config: {
                        bodyText: 'Please provide your rating and let us know how our service was:',
                        buttonTitle: 'Please Choose Rating',
                        items: [
                          { id: 'rate_1', title: '1/5', subtitle: 'Poor', targetNodeId: 'node_text_thanks' },
                          { id: 'rate_2', title: '2/5', subtitle: 'Fair', targetNodeId: 'node_text_thanks' },
                          { id: 'rate_3', title: '3/5', subtitle: 'Good', targetNodeId: 'node_text_thanks' },
                          { id: 'rate_4', title: '4/5', subtitle: 'Very Good', targetNodeId: 'node_text_thanks' },
                          { id: 'rate_5', title: '5/5', subtitle: 'Excellent', targetNodeId: 'node_text_thanks' }
                        ]
                      }
                    },
                    {
                      id: 'node_text_thanks',
                      type: 'TEXT_MESSAGE',
                      title: 'Text message',
                      headerBg: 'bg-[#DDF8E8] text-[#15803D]',
                      position: { x: 1100, y: 220 },
                      config: {
                        bodyText: 'Thanks For FeedBack ❤️ We appreciate your support!'
                      }
                    }
                  ]
                },
                { id: 'lib_support', title: 'Customer Support & Helpdesk', category: 'Support', desc: 'Interactive buttons for complaints, service requests & agent handoff.', icon: '🛠️' },
                { id: 'lib_leadgen', title: 'Lead Generation & Qualification', category: 'Marketing', desc: 'Asks budget, requirement, timeline, and automatically qualifies leads.', icon: '🎯' },
                { id: 'lib_order', title: 'Order Status & Real-Time Tracking', category: 'E-Commerce', desc: 'Allows customers to track parcel dispatch and view live invoices.', icon: '📦' }
              ].map((tpl) => (
                <div key={tpl.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-2xl">{tpl.icon}</span>
                    <h4 className="text-xs font-extrabold text-slate-900">{tpl.title}</h4>
                    <p className="text-xs text-slate-600">{tpl.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setChatbotName(tpl.title);
                      if (tpl.flowNodes) {
                        setFlowNodes(tpl.flowNodes);
                      }
                      setIsLibraryModalOpen(false);
                      setCurrentView('CANVAS');
                      toast.success(`Loaded "${tpl.title}" flow into visual canvas!`, 'Template Loaded');
                    }}
                    className="w-full py-2 bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Use Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
