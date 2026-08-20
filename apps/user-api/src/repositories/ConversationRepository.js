import { BaseRepository } from './BaseRepository.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

export class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }

  async getConversations(organizationId, { channel, status, filterType, search, page, limit }) {
    const filter = {};
    if (channel && channel !== 'ALL') {
      filter.channel = channel;
    }
    if (status) {
      filter.status = status;
    }
    if (filterType === 'PINNED') {
      filter.isPinned = true;
    } else if (filterType === 'UNREAD') {
      filter.unreadCount = { $gt: 0 };
    }

    return this.findPaginated(organizationId, {
      filter,
      sort: { isPinned: -1, updatedAt: -1 },
      populate: 'contactId assignedTo',
      page,
      limit
    });
  }

  async getMessages(organizationId, contactId, { limit = 50, before = null }) {
    const filter = { organizationId, contactId };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    return Message.find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('sentBy', 'name avatar')
      .lean();
  }

  async createMessage(organizationId, messageData) {
    const msg = new Message({
      ...messageData,
      organizationId
    });
    await msg.save();

    // Update conversation lastMessage snippet
    await Conversation.findOneAndUpdate(
      { organizationId, contactId: messageData.contactId },
      {
        $set: {
          lastMessage: {
            text: messageData.content?.text || 'Media message',
            sender: messageData.direction === 'INBOUND' ? 'CONTACT' : 'AGENT',
            sentAt: new Date(),
            status: messageData.status
          },
          status: 'ACTIVE'
        },
        $inc: { unreadCount: messageData.direction === 'INBOUND' ? 1 : 0 },
        $setOnInsert: {
          organizationId,
          contactId: messageData.contactId,
          channel: messageData.channel || 'WHATSAPP'
        }
      },
      { upsert: true, new: true }
    );

    return msg.toObject();
  }
}

export const conversationRepository = new ConversationRepository();
export default conversationRepository;
