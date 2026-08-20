import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { db } from '../config/database.js';
import {
  User,
  Organization,
  OrganizationMember,
  Plan,
  Subscription,
  Wallet,
  WalletTransaction,
  UsageRecord,
  WhatsAppAccount,
  WhatsAppPhoneNumber,
  WhatsAppTemplate,
  Contact,
  Tag,
  Lead,
  Campaign,
  Conversation,
  Message
} from '../models/index.js';
import { UserRole, TemplateCategory, TemplateStatus, SubscriptionStatus, ChannelType, LeadStage } from '@whatsapp-saas/shared-constants';

dotenv.config();

async function seed() {
  console.log('🌱 Starting Enterprise Database Seeding...');
  await db.connect();

  // Clear existing collections for a clean idempotent start
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrganizationMember.deleteMany({}),
    Plan.deleteMany({}),
    Subscription.deleteMany({}),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
    UsageRecord.deleteMany({}),
    WhatsAppAccount.deleteMany({}),
    WhatsAppPhoneNumber.deleteMany({}),
    WhatsAppTemplate.deleteMany({}),
    Contact.deleteMany({}),
    Tag.deleteMany({}),
    Lead.deleteMany({}),
    Campaign.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({})
  ]);

  console.log('🧹 Cleaned existing database records.');

  // 1. Seed Plans
  const starterPlan = await Plan.create({
    name: 'Starter Trial',
    slug: 'starter',
    price: 0,
    maxUsers: 2,
    maxContacts: 1000,
    monthlyMessageLimit: 1000,
    billingInterval: 'MONTHLY'
  });

  const basicQuarterlyPlan = await Plan.create({
    name: 'Basic',
    slug: 'basic-quarterly',
    price: 4999,
    maxUsers: 5,
    maxContacts: 5000,
    monthlyMessageLimit: 2000,
    billingInterval: 'QUARTERLY',
    isPopular: true
  });

  const enterprisePlan = await Plan.create({
    name: 'Enterprise Scale',
    slug: 'enterprise',
    price: 14999,
    maxUsers: 25,
    maxContacts: 100000,
    monthlyMessageLimit: 50000,
    billingInterval: 'YEARLY'
  });

  // 2. Seed Demo User
  const demoUser = new User({
    name: 'Wasim Ansari',
    email: 'wasim@arvee.com',
    password: 'Password@123',
    phone: '+91 87009 94288',
    isEmailVerified: true
  });
  await demoUser.save();

  // 3. Seed Demo Organization
  const demoOrg = await Organization.create({
    name: 'Arvee Appliances',
    slug: 'arvee-appliances',
    ownerId: demoUser._id,
    planId: basicQuarterlyPlan._id,
    status: 'ACTIVE'
  });

  // 4. Link Membership & Set Current Org
  await OrganizationMember.create({
    organizationId: demoOrg._id,
    userId: demoUser._id,
    role: UserRole.OWNER,
    status: 'ACTIVE'
  });

  demoUser.currentOrganizationId = demoOrg._id;
  await demoUser.save();

  // 5. Seed Subscription (Matching screenshot: Basic Quarterly expires Nov 26)
  const periodEnd = new Date('2026-11-19T16:20:00.000Z');
  await Subscription.create({
    organizationId: demoOrg._id,
    planId: basicQuarterlyPlan._id,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date('2026-08-19T16:20:00.000Z'),
    currentPeriodEnd: periodEnd
  });

  // 6. Seed Wallet (Balance ₹517.65, Used Credits ₹1481.49)
  await Wallet.create({
    organizationId: demoOrg._id,
    balance: 517.65,
    usedCredits: 1481.49,
    currency: 'INR'
  });

  await WalletTransaction.create([
    {
      organizationId: demoOrg._id,
      amount: 2000.0,
      type: 'CREDIT',
      description: 'Online Wallet Recharge via Razorpay',
      balanceAfter: 2000.0,
      referenceType: 'PAYMENT'
    },
    {
      organizationId: demoOrg._id,
      amount: 1481.49,
      type: 'DEBIT',
      description: 'Bulk Campaign Marketing Messages (3,703 recipients)',
      balanceAfter: 517.65,
      referenceType: 'CAMPAIGN'
    }
  ]);

  // 7. Seed Usage Record (Total 12,814 messages)
  const currentMonth = new Date().toISOString().substring(0, 7);
  await UsageRecord.create({
    organizationId: demoOrg._id,
    period: currentMonth,
    periodStart: new Date(2026, 7, 1),
    periodEnd: new Date(2026, 7, 31),
    messagesSent: 12814,
    messagesDelivered: 12100,
    messagesRead: 8900,
    messagesFailed: 114,
    utilityMessages: 10268,
    serviceMessages: 2258,
    marketingMessages: 288,
    authenticationMessages: 0,
    activeContactsCount: 2223
  });

  // 8. Seed WhatsApp Account & Number (Arvee Appliances)
  const waba = await WhatsAppAccount.create({
    organizationId: demoOrg._id,
    name: 'Arvee Appliances WABA',
    wabaId: 'waba_994288001',
    businessId: 'bm_8829101',
    provider: 'MOCK',
    status: 'CONNECTED'
  });

  const phoneNumber = await WhatsAppPhoneNumber.create({
    organizationId: demoOrg._id,
    whatsappAccountId: waba._id,
    phoneNumberId: 'phone_918700994288',
    displayPhoneNumber: '+91 87009 94288',
    verifiedName: 'Arvee Appliances',
    status: 'CONNECTED',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_10K',
    isDefault: true
  });

  // 9. Seed Templates
  const template1 = await WhatsAppTemplate.create({
    organizationId: demoOrg._id,
    whatsappAccountId: waba._id,
    name: 'welcome_greeting',
    category: TemplateCategory.MARKETING,
    language: 'en_US',
    status: TemplateStatus.APPROVED,
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Welcome To CHIMNEY SOLUTIONS'
      },
      {
        type: 'BODY',
        text: 'Respected {{1}},\nWelcome To CHIMNEY SOLUTIONS, We are glad to have you here. How can we assist you today?\nPlease Select Your Services:'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Raise a Request' },
          { type: 'QUICK_REPLY', text: 'Product/Service Feedback' },
          { type: 'QUICK_REPLY', text: 'Exciting Offers' }
        ]
      }
    ]
  });

  const template2 = await WhatsAppTemplate.create({
    organizationId: demoOrg._id,
    whatsappAccountId: waba._id,
    name: 'order_status_update',
    category: TemplateCategory.UTILITY,
    language: 'en_US',
    status: TemplateStatus.APPROVED,
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, your chimney service appointment is confirmed for {{2}}.'
      }
    ]
  });

  // 10. Seed Tags
  const tagVIP = await Tag.create({ organizationId: demoOrg._id, name: 'VIP Customer', color: '#8b5cf6' });
  const tagService = await Tag.create({ organizationId: demoOrg._id, name: 'Chimney Service', color: '#10b981' });
  const tagLead = await Tag.create({ organizationId: demoOrg._id, name: 'Hot Lead', color: '#ef4444' });

  // 11. Seed Contacts (Matching Screenshot 3 & 4)
  const contactSeeds = [
    { name: 'Mr Skill India', phone: '917340786436', status: 'ACTIVE', tags: ['Chimney Service'] },
    { name: 'mrs sharma', phone: '918929282551', status: 'ACTIVE', tags: ['VIP Customer'] },
    { name: 'mr.vinaik', phone: '919910449265', status: 'ACTIVE', tags: ['Chimney Service'] },
    { name: 'Mohd Zahid', phone: '919310701510', status: 'ACTIVE', tags: [] },
    { name: 'Rakesh Vinaik', phone: '919891564565', status: 'ACTIVE', tags: [] },
    { name: 'Admin Wasim', phone: '919142106093', status: 'ACTIVE', tags: [] },
    { name: 'Admin / Owner', phone: '919953107052', status: 'ACTIVE', tags: ['VIP Customer', 'Chimney Service'] },
    { name: 'shasher', phone: '914575670000', status: 'FLAGGED', tags: [] },
    { name: 'wasimfff', phone: '914545640000', status: 'FLAGGED', tags: [] },
    { name: 'Khan', phone: '918484800000', status: 'FLAGGED', tags: [] }
  ];

  const createdContacts = [];
  for (const c of contactSeeds) {
    const contact = await Contact.create({
      organizationId: demoOrg._id,
      name: c.name,
      phone: c.phone,
      email: `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      channel: ChannelType.WHATSAPP,
      tags: c.tags,
      status: c.status,
      assignedTo: demoUser._id
    });
    createdContacts.push(contact);
  }

  // 12. Seed Conversation & Messages matching Screenshot 2
  const activeContact = createdContacts.find((c) => c.name === 'Admin / Owner');
  if (activeContact) {
    const conversation = await Conversation.create({
      organizationId: demoOrg._id,
      contactId: activeContact._id,
      channel: ChannelType.WHATSAPP,
      status: 'ACTIVE',
      assignedTo: demoUser._id,
      lastMessage: {
        text: 'Yes',
        sender: 'CONTACT',
        sentAt: new Date(),
        status: 'DELIVERED'
      }
    });

    // Inbound "Hi"
    await Message.create({
      organizationId: demoOrg._id,
      contactId: activeContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Hi' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 3600000)
    });

    // Chatbot Welcome with Quick Replies
    await Message.create({
      organizationId: demoOrg._id,
      contactId: activeContact._id,
      direction: 'OUTBOUND',
      type: 'TEMPLATE',
      content: {
        text: 'Respected Admin / Owner,\nWelcome To CHIMNEY SOLUTIONS, We are glad to have you here. How can we assist you today?\nPlease Select Your Services',
        templateName: 'welcome_greeting',
        buttons: [
          { text: 'Raise a Request', payload: 'RAISE_REQ' },
          { text: 'Product/Service Feedback', payload: 'FEEDBACK' },
          { text: 'Exciting Offers', payload: 'OFFERS' }
        ]
      },
      isChatbotResponse: true,
      status: 'READ',
      createdAt: new Date(Date.now() - 3500000)
    });

    // Inbound "Yes"
    await Message.create({
      organizationId: demoOrg._id,
      contactId: activeContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Yes' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 1800000)
    });
  }

  // 13. Seed CRM Leads (matching screenshot 5 tabs)
  await Lead.create([
    {
      organizationId: demoOrg._id,
      name: 'Pooja Verma',
      phone: '919811223344',
      email: 'pooja@verma.com',
      source: 'WhatsApp Ad',
      stage: LeadStage.HOT,
      dealValue: 12500,
      assignedTo: demoUser._id
    },
    {
      organizationId: demoOrg._id,
      name: 'Amitabh Sen',
      phone: '919877665544',
      email: 'amitabh@sen.org',
      source: 'Website Form',
      stage: LeadStage.FOLLOW_UPS,
      dealValue: 8000,
      assignedTo: demoUser._id
    },
    {
      organizationId: demoOrg._id,
      name: 'Karan Mehra',
      phone: '919988776655',
      email: 'karan@mehra.in',
      source: 'WhatsApp Referral',
      stage: LeadStage.CONVERTED,
      dealValue: 24000,
      assignedTo: demoUser._id
    }
  ]);

  // 14. Seed Sample Broadcast Campaign
  await Campaign.create({
    organizationId: demoOrg._id,
    name: 'Independence Day Special Offer 2026',
    channel: ChannelType.WHATSAPP,
    whatsappPhoneNumberId: phoneNumber._id,
    templateId: template1._id,
    status: 'COMPLETED',
    audienceType: 'TAGS',
    targetTags: ['Chimney Service'],
    stats: {
      totalRecipients: 2223,
      queued: 0,
      sent: 2223,
      delivered: 2150,
      read: 1840,
      failed: 73
    },
    createdBy: demoUser._id,
    startedAt: new Date(Date.now() - 86400000),
    completedAt: new Date(Date.now() - 82800000)
  });

  console.log('✅ Enterprise Database Seeding completed successfully!');
  console.log('👤 Demo User Email: wasim@arvee.com');
  console.log('🔑 Demo User Password: Password@123');
  console.log('🏢 Demo Organization: Arvee Appliances');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding Error:', err);
  process.exit(1);
});
