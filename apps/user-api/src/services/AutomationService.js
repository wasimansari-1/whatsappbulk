import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { Contact } from '../models/Contact.js';
import { Lead } from '../models/Lead.js';
import { Wallet } from '../models/Wallet.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { getWhatsAppProvider } from '../providers/whatsapp/index.js';
import { whatsAppService } from './WhatsAppService.js';
import { emitToOrganization } from '../sockets/index.js';

function escapeRegExp(string) {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceVariables(text, contact) {
  if (!text) return '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const firstName = (contact.name || 'Customer').split(' ')[0];

  return text
    .replace(/\{\{name\}\}/gi, contact.name || 'Customer')
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{phone\}\}/gi, contact.phone || '')
    .replace(/\{\{date\}\}/gi, dateStr)
    .replace(/\{\{time\}\}/gi, timeStr)
    .replace(/\{\{email\}\}/gi, contact.email || '')
    .replace(/\{\{company\}\}/gi, 'IGlobal Tech');
}

export class AutomationService {
  async getWorkflows(organizationId) {
    return AutomationWorkflow.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async createWorkflow(organizationId, data) {
    return AutomationWorkflow.create({
      ...data,
      organizationId,
      isActive: true,
      executionCount: 0
    });
  }

  async updateWorkflow(organizationId, id, data) {
    return AutomationWorkflow.findOneAndUpdate(
      { organizationId, _id: id },
      { $set: data },
      { new: true }
    ).lean();
  }

  async toggleWorkflow(organizationId, id) {
    const wf = await AutomationWorkflow.findOne({ organizationId, _id: id });
    if (!wf) throw new Error('Workflow not found');
    wf.isActive = !wf.isActive;
    await wf.save();
    return wf.toObject();
  }

  async deleteWorkflow(organizationId, id) {
    await AutomationWorkflow.deleteOne({ organizationId, _id: id });
    return { success: true };
  }

  /**
   * Evaluates incoming message and triggers matching Chatbot workflows
   */
  /**
   * Evaluates incoming message and triggers matching Chatbot workflows (Keyword or Interactive Button / List click)
   */
  async processIncomingMessage(organizationId, contact, messageText, buttonPayload = null) {
    const activeWorkflows = await AutomationWorkflow.find({
      organizationId,
      isActive: true
    }).lean();

    console.log('[AutomationService] processIncomingMessage:', { organizationId: String(organizationId), messageText, activeWorkflows: activeWorkflows.length });

    if (!activeWorkflows || activeWorkflows.length === 0) {
      console.log(`[AutomationService] No active workflows for organization: ${organizationId}`);
      return null;
    }

    const rawText = (messageText || '').trim();
    const normalizedText = rawText.toLowerCase();

    const token = await whatsAppService.getTenantToken(organizationId);
    const provider = getWhatsAppProvider();
    
    let activePhone = await WhatsAppPhoneNumber.findOne({ organizationId, status: 'CONNECTED' }).lean();
    let phoneNumberId = activePhone?.phoneNumberId;
    if (!phoneNumberId) {
      const account = await WhatsAppAccount.findOne({ organizationId }).lean();
      phoneNumberId = account?.phoneNumberId;
    }

    if (!phoneNumberId) {
      console.warn(`[AutomationService] No connected WhatsApp phone found for Org: ${organizationId}`);
      return null;
    }

    // -------------------------------------------------------------
    // CASE A: Interactive List Selection or Button Click
    // -------------------------------------------------------------
    if (buttonPayload || rawText) {
      const payloadQuery = (buttonPayload || rawText).toLowerCase().trim();

      for (const wf of activeWorkflows) {
        const nodes = wf.nodes || [];

        for (const node of nodes) {
          const config = node.config || {};
          const buttons = config.buttons || [];
          const items = config.items || [];

          // 1. Check in List Message items / rows
          const matchedItem = items.find(
            (it) =>
              (it.id && it.id.toLowerCase() === payloadQuery) ||
              (it.title && it.title.toLowerCase().trim() === payloadQuery)
          );

          if (matchedItem && matchedItem.targetNodeId) {
            const targetNode = nodes.find((n) => n.id === matchedItem.targetNodeId);
            if (targetNode) {
              console.log(`[Chatbot] 🎯 Interactive List match: "${matchedItem.title}" ➡️ Node "${targetNode.title || targetNode.id}" in Workflow "${wf.name}"`);
              await this.executeSingleNode(organizationId, contact, targetNode, wf, token, phoneNumberId);
              await AutomationWorkflow.updateOne({ _id: wf._id }, { $inc: { executionCount: 1 } });
              return wf;
            }
          }

          // 2. Check in Quick Reply buttons
          const matchedBtn = buttons.find(
            (b) =>
              (b.id && b.id.toLowerCase() === payloadQuery) ||
              (b.text && b.text.toLowerCase().trim() === payloadQuery)
          );

          if (matchedBtn && matchedBtn.targetNodeId) {
            const targetNode = nodes.find((n) => n.id === matchedBtn.targetNodeId);
            if (targetNode) {
              console.log(`[Chatbot] 🎯 Interactive Button match: "${matchedBtn.text}" ➡️ Node "${targetNode.title || targetNode.id}" in Workflow "${wf.name}"`);
              await this.executeSingleNode(organizationId, contact, targetNode, wf, token, phoneNumberId);
              await AutomationWorkflow.updateOne({ _id: wf._id }, { $inc: { executionCount: 1 } });
              return wf;
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Anti-Loop / Cooldown Protection:
    // If a chatbot response was already sent to this contact in the last 60s,
    // and no interactive button/list item was clicked, skip duplicate auto-response.
    // -------------------------------------------------------------
    if (!buttonPayload) {
      const recentBotMsg = await Message.findOne({
        organizationId,
        contactId: contact._id,
        direction: 'OUTBOUND',
        isChatbotResponse: true,
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
      }).sort({ createdAt: -1 }).lean();

      if (recentBotMsg) {
        console.log(`[Chatbot] ⏳ Cooldown active for contact ${contact.phone} (bot replied <60s ago). Skipping duplicate auto-response.`);
        return null;
      }
    }

    // -------------------------------------------------------------
    // CASE B: Initial Keyword / Trigger Match (e.g. "hi", "Hi", "hello")
    // -------------------------------------------------------------
    for (const wf of activeWorkflows) {
      let isMatch = false;
      const nodes = wf.nodes || [];
      const startNode = nodes.find((n) => n.type === 'START_TRIGGER') || nodes[0];

      // Check keywords on trigger config or on start trigger node
      const keywordConfig = startNode?.config?.keyword || wf.triggerConfig?.keyword || '';
      const keywords = keywordConfig
        .toLowerCase()
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      // Check keyword match
      if (keywords.length > 0) {
        isMatch = keywords.some((k) => {
          if (normalizedText === k) return true;
          const escaped = escapeRegExp(k);
          // Word boundary matching handling letters, numbers, and escaped symbols safely
          const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i');
          return regex.test(normalizedText);
        });
      }

      // Check Welcome Greetings fallback (hi, hii, hello, etc.)
      if (!isMatch && (wf.triggerType === 'WELCOME_MESSAGE' || !keywordConfig)) {
        const greetingKeywords = ['hi', 'hii', 'hiii', 'hello', 'hey', 'namaste', 'start', 'help', 'menu'];
        isMatch = greetingKeywords.some(
          (g) => normalizedText === g || normalizedText.startsWith(g + ' ') || normalizedText.endsWith(' ' + g)
        );
      }

      if (isMatch) {
        console.log(`[Chatbot] 🤖 Keyword matched workflow: "${wf.name}" (ID: ${wf._id}) for incoming message: "${messageText}"`);

        // Priority 1: Target connected from startNode's targetNodeId or first button connection
        let initialNode = null;
        if (startNode) {
          const firstTargetId = startNode.config?.targetNodeId || startNode.config?.buttons?.[0]?.targetNodeId;
          if (firstTargetId) {
            initialNode = nodes.find((n) => n.id === firstTargetId);
          }
        }

        // Priority 2: If no direct wire from start trigger, find the first non-trigger node
        if (!initialNode) {
          initialNode = nodes.find((n) => n.type !== 'START_TRIGGER');
        }

        // Priority 3: Fall back to startNode itself if it contains text/body
        if (!initialNode && startNode) {
          initialNode = startNode;
        }

        if (initialNode) {
          await this.executeSingleNode(organizationId, contact, initialNode, wf, token, phoneNumberId);
        }

        // Increment execution counter
        await AutomationWorkflow.updateOne({ _id: wf._id }, { $inc: { executionCount: 1 } });
        return wf;
      }
    }

    // -------------------------------------------------------------
    // CASE C: "Any Message" / Catch-All / Default Trigger Match
    // -------------------------------------------------------------
    const anyMessageWf = activeWorkflows.find(
      (wf) =>
        wf.triggerType === 'ANY_MESSAGE' ||
        wf.triggerType === 'CATCH_ALL' ||
        wf.triggerConfig?.keyword === '*' ||
        wf.nodes?.some(
          (n) =>
            n.type === 'START_TRIGGER' &&
            (n.config?.triggerMode === 'Any Message' || n.config?.triggerMode === 'Any' || n.config?.triggerMode === 'All')
        )
    );

    if (anyMessageWf) {
      console.log(`[Chatbot] 🌐 "Any Message" Catch-All matched workflow: "${anyMessageWf.name}" (ID: ${anyMessageWf._id}) for message: "${messageText}"`);
      const nodes = anyMessageWf.nodes || [];
      const startNode = nodes.find((n) => n.type === 'START_TRIGGER') || nodes[0];

      let initialNode = null;
      if (startNode) {
        const firstTargetId = startNode.config?.targetNodeId || startNode.config?.buttons?.[0]?.targetNodeId;
        if (firstTargetId) {
          initialNode = nodes.find((n) => n.id === firstTargetId);
        }
      }

      if (!initialNode) {
        initialNode = nodes.find((n) => n.type !== 'START_TRIGGER');
      }

      if (!initialNode && startNode) {
        initialNode = startNode;
      }

      if (initialNode) {
        await this.executeSingleNode(organizationId, contact, initialNode, anyMessageWf, token, phoneNumberId);
      }

      await AutomationWorkflow.updateOne({ _id: anyMessageWf._id }, { $inc: { executionCount: 1 } });
      return anyMessageWf;
    }

    return null;
  }

  /**
   * Executes a single visual node (List Message, Button Message, Text Message, Media, or Action)
   */
  async executeSingleNode(organizationId, contact, node, workflow, token, phoneNumberId) {
    if (!node) return;

    try {
      const nodeType = (node.type || '').toUpperCase();
      const config = node.config || {};
      const provider = getWhatsAppProvider();

      // 1. INTERACTIVE LIST MESSAGE (e.g. "Select Service" ➡️ "Raise A Request", "Service Feedback", "Exciting Offer")
      if (nodeType === 'LIST_MESSAGE' || nodeType === 'LIST' || nodeType === 'SEND_LIST') {
        const rawBody = config.bodyText || config.body || config.text || 'Please choose an option from the list below:';
        const bodyText = replaceVariables(rawBody, contact);
        const buttonText = (config.buttonTitle || config.buttonText || config.menuTitle || 'Select Service').substring(0, 20);
        const headerText = replaceVariables(config.headerTitle || config.header || '', contact);
        const footerText = replaceVariables(config.footerText || config.footer || '', contact);

        const items = config.items || [];
        const sections = [
          {
            title: config.sectionTitle || 'Options',
            rows: items.map((it, idx) => ({
              id: it.id || `opt_${idx}`,
              title: replaceVariables(it.title || it.text || `Option ${idx + 1}`, contact).substring(0, 24),
              description: replaceVariables(it.subtitle || it.description || '', contact).substring(0, 72)
            }))
          }
        ];

        console.log(`[Chatbot] Dispatching Interactive List Message to ${contact.phone} (Button: "${buttonText}", ${items.length} options)`);

        const result = await provider.sendInteractiveListMessage(
          {
            phoneNumberId,
            to: contact.phone,
            headerText,
            bodyText,
            footerText,
            buttonText,
            sections
          },
          token
        );

        const providerMessageId = result?.messageId || result?.messages?.[0]?.id || `wamid.bot.list.${Date.now()}`;

        const msg = await Message.create({
          organizationId,
          contactId: contact._id,
          direction: 'OUTBOUND',
          channel: 'WHATSAPP',
          type: 'INTERACTIVE',
          content: {
            text: bodyText,
            interactiveType: 'LIST',
            buttonText,
            items: items.map((it) => ({ title: it.title, id: it.id }))
          },
          status: 'SENT',
          providerMessageId,
          isChatbotResponse: true
        });

        await Wallet.findOneAndUpdate({ organizationId, balance: { $gte: 0.05 } }, { $inc: { balance: -0.05, usedCredits: 0.05 } });

        await Conversation.findOneAndUpdate(
          { organizationId, contactId: contact._id },
          {
            $set: {
              lastMessage: {
                text: `📋 ${bodyText}`,
                sender: 'BOT',
                sentAt: new Date(),
                status: 'SENT'
              }
            }
          },
          { upsert: true }
        );

        emitToOrganization(organizationId, 'conversation.message', {
          contactId: contact._id,
          message: msg
        });
        return;
      }

      // 2. INTERACTIVE BUTTON MESSAGE (Up to 3 quick reply buttons)
      if (
        (nodeType === 'BUTTON_MESSAGE' || nodeType === 'SEND_BUTTONS' || nodeType === 'BUTTONS') ||
        (nodeType === 'START_TRIGGER' && config.buttons?.length > 0 && !config.items?.length)
      ) {
        const rawBody = config.bodyText || config.body || config.text || 'Please select an option:';
        const bodyText = replaceVariables(rawBody, contact);
        const buttons = config.buttons || [];

        console.log(`[Chatbot] Dispatching Interactive Buttons to ${contact.phone} (${buttons.length} buttons)`);

        const result = await provider.sendInteractiveButtonsMessage(
          {
            phoneNumberId,
            to: contact.phone,
            headerText: replaceVariables(config.header || config.headerTitle || '', contact),
            bodyText,
            footerText: replaceVariables(config.footer || config.footerText || '', contact),
            buttons: buttons.map((b, idx) => ({
              id: b.id || `btn_${idx}`,
              text: replaceVariables(b.text || b.title || `Option ${idx + 1}`, contact)
            }))
          },
          token
        );

        const providerMessageId = result?.messageId || result?.messages?.[0]?.id || `wamid.bot.btn.${Date.now()}`;

        const msg = await Message.create({
          organizationId,
          contactId: contact._id,
          direction: 'OUTBOUND',
          channel: 'WHATSAPP',
          type: 'INTERACTIVE',
          content: {
            text: bodyText,
            interactiveType: 'BUTTON',
            buttons: buttons.map((b) => ({ text: b.text || b.title, payload: b.id }))
          },
          status: 'SENT',
          providerMessageId,
          isChatbotResponse: true
        });

        await Wallet.findOneAndUpdate({ organizationId, balance: { $gte: 0.05 } }, { $inc: { balance: -0.05, usedCredits: 0.05 } });

        await Conversation.findOneAndUpdate(
          { organizationId, contactId: contact._id },
          {
            $set: {
              lastMessage: {
                text: `🔘 ${bodyText}`,
                sender: 'BOT',
                sentAt: new Date(),
                status: 'SENT'
              }
            }
          },
          { upsert: true }
        );

        emitToOrganization(organizationId, 'conversation.message', {
          contactId: contact._id,
          message: msg
        });
        return;
      }

      // 3. PLAIN TEXT MESSAGE
      if (
        nodeType === 'TEXT_MESSAGE' ||
        nodeType === 'SEND_MESSAGE' ||
        nodeType === 'MESSAGE' ||
        (nodeType === 'START_TRIGGER' && (config.text || config.bodyText))
      ) {
        const rawTemplate = config.bodyText || config.text || config.body || '';
        let replyText = replaceVariables(rawTemplate, contact);

        console.log(`[Chatbot] Dispatching Text Message to ${contact.phone}: "${replyText}"`);

        const result = await provider.sendTextMessage(
          {
            phoneNumberId,
            to: contact.phone,
            text: replyText
          },
          token
        );

        const providerMessageId = result?.messageId || result?.messages?.[0]?.id || `wamid.bot.txt.${Date.now()}`;

        const msg = await Message.create({
          organizationId,
          contactId: contact._id,
          direction: 'OUTBOUND',
          channel: 'WHATSAPP',
          type: 'TEXT',
          content: { text: replyText },
          status: 'SENT',
          providerMessageId,
          isChatbotResponse: true
        });

        const wDebit = await Wallet.findOneAndUpdate({ organizationId, balance: { $gte: 0.05 } }, { $inc: { balance: -0.05, usedCredits: 0.05 } }, { new: true });
        console.log(`[AutomationService] Wallet debited for org ${organizationId}: new balance = ${wDebit?.balance}`);

        await Conversation.findOneAndUpdate(
          { organizationId, contactId: contact._id },
          {
            $set: {
              lastMessage: {
                text: replyText,
                sender: 'BOT',
                sentAt: new Date(),
                status: 'SENT'
              }
            }
          },
          { upsert: true }
        );

        emitToOrganization(organizationId, 'conversation.message', {
          contactId: contact._id,
          message: msg
        });

        // Sequential message chaining (iske baad ye message jaye)
        const nextNodeId = config.targetNodeId || node.targetNodeId;
        if (nextNodeId && workflow?.nodes) {
          const nextNode = workflow.nodes.find((n) => n.id === nextNodeId);
          if (nextNode && nextNode.id !== node.id) {
            console.log(`[Chatbot] ⏩ Executing chained sequential node "${nextNode.title || nextNode.id}"`);
            await this.executeSingleNode(organizationId, contact, nextNode, workflow, token, phoneNumberId);
          }
        }
        return;
      }

      // 4. MEDIA / IMAGE MESSAGE
      if ((nodeType === 'SEND_IMAGE' || nodeType === 'IMAGE' || nodeType === 'MEDIA_BUTTON') && (config.url || config.imageUrl)) {
        const mediaUrl = config.url || config.imageUrl;
        const caption = (config.caption || config.bodyText || config.text || '').replace(/\{\{name\}\}/gi, contact.name || 'Customer');

        const result = await provider.sendMediaMessage(
          {
            phoneNumberId,
            to: contact.phone,
            type: 'image',
            mediaUrl,
            caption
          },
          token
        );

        const providerMessageId = result?.messageId || result?.messages?.[0]?.id || `wamid.bot.img.${Date.now()}`;

        const msg = await Message.create({
          organizationId,
          contactId: contact._id,
          direction: 'OUTBOUND',
          channel: 'WHATSAPP',
          type: 'IMAGE',
          content: { url: mediaUrl, caption },
          status: 'SENT',
          providerMessageId,
          isChatbotResponse: true
        });

        emitToOrganization(organizationId, 'conversation.message', {
          contactId: contact._id,
          message: msg
        });

        // Sequential message chaining for Media
        const nextNodeId = config.targetNodeId || node.targetNodeId;
        if (nextNodeId && workflow?.nodes) {
          const nextNode = workflow.nodes.find((n) => n.id === nextNodeId);
          if (nextNode && nextNode.id !== node.id) {
            console.log(`[Chatbot] ⏩ Executing chained sequential node "${nextNode.title || nextNode.id}"`);
            await this.executeSingleNode(organizationId, contact, nextNode, workflow, token, phoneNumberId);
          }
        }
        return;
      }
      // 5. Update Lead Stage / Convert Lead
      if (nodeType === 'UPDATE_LEAD_STAGE' || nodeType === 'CONVERT_LEAD') {
        await Lead.findOneAndUpdate(
          { organizationId, phone: contact.phone },
          {
            $set: {
              name: contact.name,
              phone: contact.phone,
              email: contact.email || '',
              stage: config.stage || 'HOT',
              source: 'WhatsApp Chatbot',
              dealValue: config.dealValue || 10000
            },
            $setOnInsert: { organizationId, contactId: contact._id }
          },
          { upsert: true }
        );
      }

      // 6. Add Tag to Contact
      if (nodeType === 'ADD_TAG' && config.tag) {
        await Contact.updateOne(
          { _id: contact._id },
          { $addToSet: { tags: config.tag } }
        );
      }
    } catch (err) {
      console.error(`[Chatbot] Error executing node "${node.title || node.id}":`, err.message);
    }
  }
}

export const automationService = new AutomationService();
export default automationService;
