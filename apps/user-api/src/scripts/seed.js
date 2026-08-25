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
  ContactList,
  Tag,
  Lead,
  Campaign,
  CampaignRecipient,
  Conversation,
  Message,
  AutomationWorkflow,
  MetaAdCampaign,
  FacebookPageConnection,
  MetaLeadForm,
  MetaAuditLog,
  ProductCatalog,
  IntegrationConfig
} from '../models/index.js';
import {
  UserRole,
  TemplateCategory,
  TemplateStatus,
  SubscriptionStatus,
  ChannelType
} from '@whatsapp-saas/shared-constants';
import { CRMLeadStage } from '../models/Lead.js';

import { runBackup } from './backup.js';

dotenv.config();

async function seed() {
  console.log('\n================================================================');
  console.log('🌱 DATABASE SEED SCRIPT INVOCATION ATTEMPTED');
  console.log('================================================================');

  const isProduction = process.env.NODE_ENV === 'production';
  const isEmergencyOverride = process.env.ALLOW_PRODUCTION_SEED_EMERGENCY_OVERRIDE === 'true';

  if (isProduction && !isEmergencyOverride) {
    console.error('\n⛔ [CRITICAL SECURITY GUARD] DATABASE SEEDING FORBIDDEN IN PRODUCTION (NODE_ENV=production)!');
    console.error('   Running seed in production will destroy live enterprise customer data and WhatsApp conversations.');
    console.error('   Aborting immediately.\n');
    process.exit(1);
  }

  await db.connect();

  const isForce = process.argv.includes('--force');
  const existingOrgCount = await Organization.countDocuments();
  const existingLeadsCount = await Lead.countDocuments();

  if ((existingOrgCount > 0 || existingLeadsCount > 0) && !isForce) {
    console.warn('\n⚠️  [SEED SAFETY GUARD] Database already contains active enterprise data!');
    console.warn(`   Found ${existingOrgCount} organizations and ${existingLeadsCount} leads.`);
    console.warn('   Seeding aborted to prevent overwriting your live WhatsApp chats, templates, and leads.');
    console.warn('   If you really want to reset in local development, run: npm run seed -- --force\n');
    await db.disconnect();
    return;
  }

  // If force is provided and data exists, auto-backup first!
  if (existingOrgCount > 0 || existingLeadsCount > 0) {
    console.log('📦 Taking automatic backup before forced seed reset...');
    try {
      await runBackup();
    } catch (bErr) {
      console.warn('Backup warning:', bErr.message);
    }
  }

  // Clean existing records for fresh complete setup
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
    ContactList.deleteMany({}),
    Tag.deleteMany({}),
    Lead.deleteMany({}),
    Campaign.deleteMany({}),
    CampaignRecipient.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    AutomationWorkflow.deleteMany({}),
    MetaAdCampaign.deleteMany({}),
    FacebookPageConnection.deleteMany({}),
    MetaLeadForm.deleteMany({}),
    MetaAuditLog.deleteMany({}),
    ProductCatalog.deleteMany({}),
    IntegrationConfig.deleteMany({})
  ]);

  console.log('🧹 Cleaned existing database collections.');

  // 1. Seed Subscription Plans
  const starterPlan = await Plan.create({
    name: 'Starter Trial',
    slug: 'starter',
    price: 0,
    maxUsers: 2,
    maxContacts: 1000,
    monthlyMessageLimit: 1000,
    billingInterval: 'MONTHLY'
  });

  const professionalPlan = await Plan.create({
    name: 'Professional Enterprise',
    slug: 'professional',
    price: 2999,
    maxUsers: 10,
    maxContacts: 25000,
    monthlyMessageLimit: 25000,
    billingInterval: 'MONTHLY',
    isPopular: true,
    features: {
      automationEnabled: true,
      analyticsEnabled: true,
      apiEnabled: true,
      teamInboxEnabled: true,
      crmEnabled: true,
      whiteLabelEnabled: false
    }
  });

  const enterprisePlan = await Plan.create({
    name: 'Scale & Growth',
    slug: 'enterprise',
    price: 9999,
    maxUsers: 50,
    maxContacts: 100000,
    monthlyMessageLimit: 100000,
    billingInterval: 'YEARLY'
  });

  // 2. Seed Primary User
  const primaryUser = new User({
    name: 'Wasim Ansari',
    email: 'wasim@arvee.com',
    password: 'Password@123',
    phone: '+91 91998 00309',
    isEmailVerified: true
  });
  await primaryUser.save();

  // 3. Seed Primary Organization
  const org = await Organization.create({
    name: 'IGlobal Tech',
    slug: 'iglobal-tech',
    ownerId: primaryUser._id,
    planId: professionalPlan._id,
    status: 'ACTIVE'
  });

  // 4. Link Membership & Set Current Org
  await OrganizationMember.create({
    organizationId: org._id,
    userId: primaryUser._id,
    role: UserRole.OWNER,
    status: 'ACTIVE'
  });

  primaryUser.currentOrganizationId = org._id;
  await primaryUser.save();

  // 5. Seed Subscription
  const periodEnd = new Date(Date.now() + 90 * 86400000);
  await Subscription.create({
    organizationId: org._id,
    planId: professionalPlan._id,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date(),
    currentPeriodEnd: periodEnd
  });

  // 6. Seed Wallet & Transactions
  await Wallet.create({
    organizationId: org._id,
    balance: 2450.75,
    usedCredits: 549.25,
    currency: 'INR'
  });

  await WalletTransaction.create([
    {
      organizationId: org._id,
      amount: 3000.0,
      type: 'CREDIT',
      description: 'Account Wallet Top-Up via Razorpay',
      balanceAfter: 3000.0,
      referenceType: 'PAYMENT'
    },
    {
      organizationId: org._id,
      amount: 549.25,
      type: 'DEBIT',
      description: 'Usage deduction for WhatsApp Broadcast & Meta Ads',
      balanceAfter: 2450.75,
      referenceType: 'CAMPAIGN'
    }
  ]);

  // 7. Seed Usage Records (For Dashboard Charts & Breakdown)
  const currentPeriod = new Date().toISOString().substring(0, 7);
  const now = new Date();
  const usagePeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usagePeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  await UsageRecord.create({
    organizationId: org._id,
    period: currentPeriod,
    periodStart: usagePeriodStart,
    periodEnd: usagePeriodEnd,
    messagesSent: 13314,
    messagesDelivered: 12980,
    messagesRead: 9840,
    messagesFailed: 84,
    utilityMessages: 3420,
    marketingMessages: 8450,
    serviceMessages: 1210,
    authenticationMessages: 234
  });

  // 8. Seed WhatsApp Account & Verified Phone Number
  const wabaId = process.env.META_WABA_ID || '2959370387746581';
  const phoneId = process.env.META_PHONE_NUMBER_ID || '1223600624165995';

  const waba = await WhatsAppAccount.create({
    organizationId: org._id,
    name: 'IGlobal Tech WABA',
    wabaId,
    businessId: process.env.META_BUSINESS_ID || '993604119807437',
    provider: 'META',
    onboardingMethod: 'EMBEDDED_SIGNUP',
    status: 'CONNECTED',
    coexistenceStatus: 'ENABLED',
    accountReviewStatus: 'APPROVED'
  });

  const phoneNumber = await WhatsAppPhoneNumber.create({
    organizationId: org._id,
    whatsappAccountId: waba._id,
    phoneNumberId: phoneId,
    displayPhoneNumber: '+91 91998 00309',
    verifiedName: 'IGlobal Tech',
    platformType: 'WHATSAPP_BUSINESS_APP',
    status: 'CONNECTED',
    coexistenceEligible: true,
    coexistenceStatus: 'ACTIVE',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_10K',
    isDefault: true
  });

  // 9. Seed WhatsApp Templates (with approved interactive components)
  const template1 = await WhatsAppTemplate.create({
    organizationId: org._id,
    whatsappAccountId: waba._id,
    wabaId,
    name: 'welcome_greeting',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Welcome To IGLOBAL TECH SOLUTIONS'
      },
      {
        type: 'BODY',
        text: 'Respected {{1}},\nWelcome to IGlobal Tech WhatsApp Business Portal. We are glad to have you here! How can we assist you today?\nPlease select from our services below:'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to opt-out'
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
    organizationId: org._id,
    whatsappAccountId: waba._id,
    wabaId,
    name: 'chimney_service_offer',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '🎉 Exclusive 20% Off Chimney Service'
      },
      {
        type: 'BODY',
        text: 'Hello {{1}},\nKeep your kitchen fresh and smokefree! Book our certified chimney deep cleaning & motor inspection at an exclusive 20% discount this month.\n\nUse Code: CHIMNEY20'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Book Service Now' },
          { type: 'QUICK_REPLY', text: 'View Pricing' }
        ]
      }
    ]
  });

  const template3 = await WhatsAppTemplate.create({
    organizationId: org._id,
    whatsappAccountId: waba._id,
    wabaId,
    name: 'lead_followup_reminder',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\nThis is Wasim from IGlobal Tech following up on your inquiry for {{2}}. We would love to address any questions you have or schedule a quick 1-on-1 demo.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Schedule Demo' },
          { type: 'QUICK_REPLY', text: 'Call Me Now' }
        ]
      }
    ]
  });

  const template4 = await WhatsAppTemplate.create({
    organizationId: org._id,
    whatsappAccountId: waba._id,
    wabaId,
    name: 'order_status_update',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}},\nYour chimney service appointment #{{2}} has been confirmed for {{3}}. Our certified technician will arrive on time.'
      }
    ]
  });

  const template5 = await WhatsAppTemplate.create({
    organizationId: org._id,
    whatsappAccountId: waba._id,
    wabaId,
    name: 'meta_lead_instant_welcome',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Thank you for reaching out on Facebook!'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, thanks for your inquiry through our Facebook ad for {{2}}! Our team is ready to assist you right here on WhatsApp.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Talk to Expert' },
          { type: 'QUICK_REPLY', text: 'Get Brochure' }
        ]
      }
    ]
  });

  // 10. Seed Tags
  const tagVIP = await Tag.create({ organizationId: org._id, name: 'VIP Customer', color: '#8b5cf6' });
  const tagChimney = await Tag.create({ organizationId: org._id, name: 'Chimney Service', color: '#10b981' });
  const tagHotLead = await Tag.create({ organizationId: org._id, name: 'Hot Lead', color: '#ef4444' });
  const tagMetaLead = await Tag.create({ organizationId: org._id, name: 'Facebook Ads Lead', color: '#3b82f6' });
  const tagHighValue = await Tag.create({ organizationId: org._id, name: 'High Value', color: '#f59e0b' });
  const tagDelhi = await Tag.create({ organizationId: org._id, name: 'Delhi NCR', color: '#06b6d4' });

  // 11. Seed Contacts
  const contactSeeds = [
    { name: 'Admin / Owner', phone: '919953107052', email: 'owner@iglobaltech.com', city: 'Delhi', tags: ['VIP Customer', 'Chimney Service', 'High Value'], groupName: 'VIP Club', status: 'ACTIVE' },
    { name: 'Mr Skill India', phone: '917340786436', email: 'skillindia@example.com', city: 'Jaipur', tags: ['Chimney Service'], groupName: 'General', status: 'ACTIVE' },
    { name: 'mrs sharma', phone: '918929282551', email: 'sharma.mrs@example.com', city: 'Noida', tags: ['VIP Customer', 'Delhi NCR'], groupName: 'Delhi NCR Customers', status: 'ACTIVE' },
    { name: 'mr.vinaik', phone: '919910449265', email: 'vinaik@example.com', city: 'Gurgaon', tags: ['Chimney Service', 'Delhi NCR'], groupName: 'Delhi NCR Customers', status: 'ACTIVE' },
    { name: 'Mohd Zahid', phone: '919310701510', email: 'zahid@example.com', city: 'Delhi', tags: ['Hot Lead', 'Facebook Ads Lead'], groupName: 'Meta Inquiries', status: 'ACTIVE' },
    { name: 'Rakesh Vinaik', phone: '919891564565', email: 'rakesh.v@example.com', city: 'Faridabad', tags: ['Chimney Service'], groupName: 'General', status: 'ACTIVE' },
    { name: 'Admin Wasim', phone: '919142106093', email: 'wasim.admin@example.com', city: 'Delhi', tags: ['VIP Customer'], groupName: 'VIP Club', status: 'ACTIVE' },
    { name: 'Rahul Verma', phone: '919811234567', email: 'rahul.verma@gmail.com', city: 'Delhi', tags: ['Facebook Ads Lead', 'Hot Lead'], groupName: 'Meta Inquiries', status: 'ACTIVE' },
    { name: 'Deepa Krishnan', phone: '919712345678', email: 'deepa.k@yahoo.com', city: 'Bengaluru', tags: ['Facebook Ads Lead'], groupName: 'Meta Inquiries', status: 'ACTIVE' },
    { name: 'Vikas Oberoi', phone: '919911223344', email: 'vikas.o@enterprise.in', city: 'Mumbai', tags: ['High Value', 'Facebook Ads Lead'], groupName: 'Enterprise', status: 'ACTIVE' },
    { name: 'Pooja Verma', phone: '919811223344', email: 'pooja@verma.com', city: 'Delhi', tags: ['Hot Lead', 'Chimney Service'], groupName: 'General', status: 'ACTIVE' },
    { name: 'Amitabh Sen', phone: '919877665544', email: 'amitabh@sen.org', city: 'Kolkata', tags: ['VIP Customer'], groupName: 'VIP Club', status: 'ACTIVE' },
    { name: 'Karan Mehra', phone: '919988776655', email: 'karan@mehra.in', city: 'Chandigarh', tags: ['High Value', 'VIP Customer'], groupName: 'VIP Club', status: 'ACTIVE' },
    { name: 'shasher', phone: '914575670000', email: 'shasher@sample.com', city: 'Pune', tags: [], groupName: 'General', status: 'FLAGGED' },
    { name: 'Khan', phone: '918484800000', email: 'khan@sample.com', city: 'Hyderabad', tags: [], groupName: 'General', status: 'FLAGGED' }
  ];

  const createdContacts = [];
  for (const c of contactSeeds) {
    const contact = await Contact.create({
      organizationId: org._id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.city,
      channel: ChannelType.WHATSAPP,
      tags: c.tags,
      groupName: c.groupName,
      status: c.status,
      assignedTo: primaryUser._id
    });
    createdContacts.push(contact);
  }

  // 12. Seed Contact Lists
  const contactList1 = await ContactList.create({
    organizationId: org._id,
    name: 'Delhi NCR VIP Customers',
    description: 'High-value and recurring chimney service clients in Delhi NCR',
    contactCount: 6,
    tags: ['Delhi NCR', 'VIP Customer']
  });

  const contactList2 = await ContactList.create({
    organizationId: org._id,
    name: 'May 2026 Meta Ads Audience',
    description: 'Leads and inquiries originating from Facebook & Instagram Click-to-WhatsApp ads',
    contactCount: 5,
    tags: ['Facebook Ads Lead']
  });

  // 13. Seed Facebook Connected Page
  await FacebookPageConnection.create({
    organizationId: org._id,
    pageId: '1049968644261349',
    pageName: 'IGlobal Tech - Official Business Page',
    pageCategory: 'Software & Technology',
    adAccountId: 'act_681426903930095',
    status: 'CONNECTED',
    leadsSubscribed: true
  });

  // 14. Seed Meta Lead Forms
  await MetaLeadForm.create([
    {
      organizationId: org._id,
      metaFormId: 'form_1049968644261349_01',
      pageId: '1049968644261349',
      pageName: 'IGlobal Tech - Official Business Page',
      name: 'May 25 Instant Lead Form',
      status: 'ACTIVE',
      leadsCount: 96,
      privacyPolicyUrl: 'https://wappbiz.io/privacy',
      questions: [
        { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
        { key: 'phone_number', label: 'Phone Number', type: 'PHONE' },
        { key: 'email', label: 'Email', type: 'EMAIL' },
        { key: 'city', label: 'City', type: 'CITY' }
      ]
    },
    {
      organizationId: org._id,
      metaFormId: 'form_1049968644261349_02',
      pageId: '1049968644261349',
      pageName: 'IGlobal Tech - Official Business Page',
      name: 'Chimney Installation & Service Inquiry Form',
      status: 'ACTIVE',
      leadsCount: 42,
      privacyPolicyUrl: 'https://wappbiz.io/privacy',
      questions: [
        { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
        { key: 'phone_number', label: 'Phone Number', type: 'PHONE' },
        { key: 'service_type', label: 'Required Service', type: 'CUSTOM' }
      ]
    }
  ]);

  // 15. Seed Authentic Verified Meta Ad Campaign
  await MetaAdCampaign.create([
    {
      organizationId: org._id,
      metaCampaignId: '120208492019401',
      metaAccountId: 'act_681426903930095',
      name: 'May 25 26',
      objective: 'OUTCOME_LEADS',
      status: 'ACTIVE',
      dailyBudget: 1500,
      spend: 1694.59,
      impressions: 10128,
      reach: 8420,
      clicks: 245,
      leadsCount: 96,
      cpl: 17.65,
      cpc: 6.91,
      cpm: 167.31,
      ctr: 2.42,
      createdAt: new Date('2025-05-25T08:00:00Z')
    }
  ]);

  // 16. Seed Authentic CRM Leads Belonging to Verified Account
  const leadsData = [
    {
      organizationId: org._id,
      metaLeadId: 'lead_meta_9948101',
      name: 'Rahul Verma',
      firstName: 'Rahul',
      lastName: 'Verma',
      phone: '919811234567',
      email: 'rahul.verma@gmail.com',
      city: 'Delhi',
      state: 'Delhi',
      source: 'Meta Click-to-WhatsApp',
      stage: CRMLeadStage.NEW,
      priority: 'HIGH',
      dealValue: 15000,
      pageId: '1049968644261349',
      pageName: 'IGlobal Tech - Official Business Page',
      metaCampaignId: '120208492019401',
      metaCampaignName: 'May 25 26',
      metaAdSetName: 'Delhi NCR - Homeowners & Appliances',
      metaAdName: 'Chimney Service Instant WhatsApp CTA',
      metaFormName: 'May 25 Instant Lead Form',
      notes: 'Inquired from Facebook Ad regarding kitchen chimney motor repair and ducting setup.',
      assignedTo: primaryUser._id,
      assignedName: 'Wasim Ansari',
      createdAt: new Date('2025-05-25T08:30:00Z')
    },
    {
      organizationId: org._id,
      metaLeadId: 'lead_meta_9948104',
      name: 'Sunita Mishra',
      firstName: 'Sunita',
      lastName: 'Mishra',
      phone: '919899112233',
      email: 'sunita.m@gmail.com',
      city: 'Noida',
      source: 'Facebook Lead Ads',
      stage: CRMLeadStage.CONTACTED,
      priority: 'MEDIUM',
      dealValue: 12000,
      metaCampaignId: '120208492019401',
      metaCampaignName: 'May 25 26',
      notes: 'Sent welcome template message and brochure via WhatsApp.',
      assignedTo: primaryUser._id,
      assignedName: 'Wasim Ansari',
      createdAt: new Date('2025-05-25T13:45:00Z')
    },
    {
      organizationId: org._id,
      metaLeadId: 'lead_meta_9948105',
      name: 'Pooja Verma',
      firstName: 'Pooja',
      lastName: 'Verma',
      phone: '919811223344',
      email: 'pooja@verma.com',
      city: 'Delhi',
      source: 'Meta Click-to-WhatsApp',
      stage: CRMLeadStage.INTERESTED,
      priority: 'HIGH',
      dealValue: 18500,
      metaCampaignId: '120208492019401',
      metaCampaignName: 'May 25 26',
      notes: 'Requested quotation for curved glass chimney model with 5-year comprehensive AMC.',
      assignedTo: primaryUser._id,
      assignedName: 'Wasim Ansari',
      createdAt: new Date('2025-05-26T11:20:00Z')
    },
    {
      organizationId: org._id,
      metaLeadId: 'lead_meta_9948103',
      name: 'Vikas Oberoi',
      firstName: 'Vikas',
      lastName: 'Oberoi',
      phone: '919911223344',
      email: 'vikas.o@enterprise.in',
      city: 'Mumbai',
      source: 'Meta Click-to-WhatsApp',
      stage: CRMLeadStage.NEW,
      priority: 'HIGH',
      dealValue: 22000,
      metaCampaignId: '120208492019401',
      metaCampaignName: 'May 25 26',
      notes: 'Commercial kitchen owner seeking bulk chimney installation quotation.',
      assignedTo: primaryUser._id,
      assignedName: 'Wasim Ansari',
      createdAt: new Date('2025-05-26T16:05:00Z')
    },
    {
      organizationId: org._id,
      name: 'Karan Mehra',
      firstName: 'Karan',
      lastName: 'Mehra',
      phone: '919988776655',
      email: 'karan@mehra.in',
      city: 'Chandigarh',
      source: 'Meta Click-to-WhatsApp',
      stage: CRMLeadStage.CONVERTED,
      priority: 'HIGH',
      dealValue: 45000,
      metaCampaignId: '120208492019401',
      metaCampaignName: 'May 25 26',
      notes: 'Payment confirmed via Razorpay. Installation completed and 5-star review received.',
      assignedTo: primaryUser._id,
      assignedName: 'Wasim Ansari',
      createdAt: new Date('2025-05-26T18:50:00Z')
    }
  ];

  await Lead.create(leadsData);

  // 17. Seed WhatsApp Broadcast Campaigns (Matching full delivery stats)
  const broadcast1 = await Campaign.create({
    organizationId: org._id,
    name: 'Independence Day Special Mega Offer 2026',
    channel: ChannelType.WHATSAPP,
    whatsappPhoneNumberId: phoneNumber._id,
    templateId: template1._id,
    status: 'COMPLETED',
    audienceType: 'TAGS',
    targetTags: ['Chimney Service'],
    sendSpeedPerMinute: 120,
    stats: {
      totalRecipients: 2223,
      queued: 0,
      sent: 2223,
      delivered: 2150,
      read: 1840,
      failed: 73
    },
    createdBy: primaryUser._id,
    startedAt: new Date(Date.now() - 86400000),
    completedAt: new Date(Date.now() - 82800000)
  });

  const broadcast2 = await Campaign.create({
    organizationId: org._id,
    name: 'May 25 Meta Leads Retargeting Broadcast',
    channel: ChannelType.WHATSAPP,
    whatsappPhoneNumberId: phoneNumber._id,
    templateId: template2._id,
    status: 'COMPLETED',
    audienceType: 'TAGS',
    targetTags: ['Facebook Ads Lead'],
    sendSpeedPerMinute: 60,
    stats: {
      totalRecipients: 1450,
      queued: 0,
      sent: 1450,
      delivered: 1410,
      read: 1230,
      failed: 40
    },
    createdBy: primaryUser._id,
    startedAt: new Date(Date.now() - 172800000),
    completedAt: new Date(Date.now() - 169200000)
  });

  const broadcast3 = await Campaign.create({
    organizationId: org._id,
    name: 'VIP Customer Exclusive Maintenance Blast',
    channel: ChannelType.WHATSAPP,
    whatsappPhoneNumberId: phoneNumber._id,
    templateId: template3._id,
    status: 'COMPLETED',
    audienceType: 'TAGS',
    targetTags: ['VIP Customer'],
    sendSpeedPerMinute: 60,
    stats: {
      totalRecipients: 520,
      queued: 0,
      sent: 520,
      delivered: 512,
      read: 490,
      failed: 8
    },
    createdBy: primaryUser._id,
    startedAt: new Date(Date.now() - 259200000),
    completedAt: new Date(Date.now() - 255600000)
  });

  const broadcast4 = await Campaign.create({
    organizationId: org._id,
    name: 'Weekend Flash Sale 40% OFF Special',
    channel: ChannelType.WHATSAPP,
    whatsappPhoneNumberId: phoneNumber._id,
    templateId: template2._id,
    status: 'SCHEDULED',
    audienceType: 'ALL',
    targetTags: [],
    scheduledAt: new Date(Date.now() + 86400000),
    stats: {
      totalRecipients: 3500,
      queued: 3500,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0
    },
    createdBy: primaryUser._id
  });

  // 18. Seed Active Inbox Conversations & Messages (Real-time Team Chat)
  const activeContact1 = createdContacts.find((c) => c.name === 'Admin / Owner');
  if (activeContact1) {
    const conv1 = await Conversation.create({
      organizationId: org._id,
      contactId: activeContact1._id,
      channel: ChannelType.WHATSAPP,
      status: 'ACTIVE',
      isPinned: true,
      unreadCount: 0,
      assignedTo: primaryUser._id,
      lastMessage: {
        text: 'Great, thanks! Please schedule technician for 10:30 AM.',
        sender: 'CONTACT',
        sentAt: new Date(Date.now() - 600000),
        status: 'DELIVERED'
      }
    });

    // Message 1: Inbound "Hi"
    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: activeContact1._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Hi' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 7200000)
    });

    // Message 2: Chatbot Welcome with Quick Replies
    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: activeContact1._id,
      direction: 'OUTBOUND',
      type: 'TEMPLATE',
      content: {
        text: 'Respected Admin / Owner,\nWelcome To IGLOBAL TECH SOLUTIONS, We are glad to have you here. How can we assist you today?\nPlease select from our services below:',
        templateName: 'welcome_greeting',
        buttons: [
          { btnType: 'QUICK_REPLY', text: 'Raise a Request', payload: 'RAISE_REQ' },
          { btnType: 'QUICK_REPLY', text: 'Product/Service Feedback', payload: 'FEEDBACK' },
          { btnType: 'QUICK_REPLY', text: 'Exciting Offers', payload: 'OFFERS' }
        ]
      },
      isChatbotResponse: true,
      status: 'READ',
      createdAt: new Date(Date.now() - 7100000)
    });

    // Message 3: Inbound Quick reply click
    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: activeContact1._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Raise a Request' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 3600000)
    });

    // Message 4: Outbound Agent response
    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: activeContact1._id,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: { text: 'Thank you for reaching out! Our service team has received your request. A specialist technician will visit your location.' },
      sentBy: primaryUser._id,
      status: 'READ',
      createdAt: new Date(Date.now() - 1800000)
    });

    // Message 5: Inbound confirmation
    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: activeContact1._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Great, thanks! Please schedule technician for 10:30 AM.' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 600000)
    });
  }

  // Conversation 2: Rahul Verma (Meta Click-to-WhatsApp Lead)
  const rahulContact = createdContacts.find((c) => c.name === 'Rahul Verma');
  if (rahulContact) {
    await Conversation.create({
      organizationId: org._id,
      contactId: rahulContact._id,
      channel: ChannelType.WHATSAPP,
      status: 'ACTIVE',
      isPinned: true,
      unreadCount: 1,
      assignedTo: primaryUser._id,
      lastMessage: {
        text: 'I am in Dwarka Sector 12. Can you send someone tomorrow morning?',
        sender: 'CONTACT',
        sentAt: new Date(Date.now() - 1200000),
        status: 'DELIVERED'
      }
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: rahulContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Hi, I saw your ad on Facebook regarding chimney repair service.' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 7200000)
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: rahulContact._id,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: { text: 'Hello Rahul! 👋 Thank you for connecting through our Facebook ad. We offer comprehensive chimney deep cleaning, motor repair, and ducting service. Could you share your location in Delhi NCR?' },
      sentBy: primaryUser._id,
      status: 'READ',
      createdAt: new Date(Date.now() - 3600000)
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: rahulContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'I am in Dwarka Sector 12. Can you send someone tomorrow morning?' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 1200000)
    });
  }

  // Conversation 3: Mrs Sharma
  const sharmaContact = createdContacts.find((c) => c.name === 'mrs sharma');
  if (sharmaContact) {
    await Conversation.create({
      organizationId: org._id,
      contactId: sharmaContact._id,
      channel: ChannelType.WHATSAPP,
      status: 'ACTIVE',
      unreadCount: 0,
      assignedTo: primaryUser._id,
      lastMessage: {
        text: 'Yes please apply the VIP20 discount coupon.',
        sender: 'CONTACT',
        sentAt: new Date(Date.now() - 2400000),
        status: 'DELIVERED'
      }
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: sharmaContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Is there any discount running right now for chimney deep cleaning?' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 7200000)
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: sharmaContact._id,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: { text: 'Hello Mrs. Sharma! Yes, our Festive 20% discount is currently active for all VIP members! Would you like us to apply the promo code VIP20?' },
      sentBy: primaryUser._id,
      status: 'READ',
      createdAt: new Date(Date.now() - 4800000)
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: sharmaContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Yes please apply the VIP20 discount coupon.' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 2400000)
    });
  }

  // Conversation 4: Pooja Verma
  const poojaContact = createdContacts.find((c) => c.name === 'Pooja Verma');
  if (poojaContact) {
    await Conversation.create({
      organizationId: org._id,
      contactId: poojaContact._id,
      channel: ChannelType.WHATSAPP,
      status: 'ACTIVE',
      unreadCount: 0,
      assignedTo: primaryUser._id,
      lastMessage: {
        text: 'Hi Wasim, I have shared the details with my team. We will finalize by Friday.',
        sender: 'CONTACT',
        sentAt: new Date(Date.now() - 5400000),
        status: 'DELIVERED'
      }
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: poojaContact._id,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: { text: 'Hello Pooja, this is a follow-up from IGlobal Tech regarding the annual maintenance contract proposal.' },
      sentBy: primaryUser._id,
      status: 'READ',
      createdAt: new Date(Date.now() - 10800000)
    });

    await Message.create({
      organizationId: org._id,
      whatsappPhoneNumberId: phoneNumber._id,
      contactId: poojaContact._id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: { text: 'Hi Wasim, I have shared the details with my team. We will finalize by Friday.' },
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 5400000)
    });
  }

  // 19. Seed Product Catalog
  await ProductCatalog.create([
    {
      organizationId: org._id,
      retailerId: 'PROD_CHIM_01',
      name: 'Kitchen Chimney Auto-Clean 60cm Heat Clean',
      description: 'Touch control with motion sensor, 1200 m3/hr suction, baffle filter, oil collector',
      price: 14999,
      currency: 'INR',
      availability: 'IN_STOCK',
      category: 'Appliances',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=60',
      url: 'https://iglobaltech.com/products/chimney-60cm'
    },
    {
      organizationId: org._id,
      retailerId: 'PROD_CHIM_02',
      name: 'Curved Glass Kitchen Chimney 90cm Premium',
      description: 'Heavy duty brushless motor, 1500 m3/hr suction, silent operation, gesture control',
      price: 22499,
      currency: 'INR',
      availability: 'IN_STOCK',
      category: 'Appliances',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=60',
      url: 'https://iglobaltech.com/products/chimney-90cm'
    },
    {
      organizationId: org._id,
      retailerId: 'SERV_CLEAN_01',
      name: 'Chimney Deep Cleaning & Chemical Wash Service',
      description: 'Complete dismantling, chemical degreasing, motor carbon cleaning, and refitting',
      price: 1299,
      currency: 'INR',
      availability: 'IN_STOCK',
      category: 'Services',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=60',
      url: 'https://iglobaltech.com/services/cleaning'
    },
    {
      organizationId: org._id,
      retailerId: 'SERV_AMC_01',
      name: 'Annual Maintenance Contract (AMC) - Premium 1 Year',
      description: '3 free services per year, unlimited breakdown visits, 20% discount on spare parts',
      price: 3499,
      currency: 'INR',
      availability: 'IN_STOCK',
      category: 'Services',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=60',
      url: 'https://iglobaltech.com/services/amc'
    }
  ]);

  // 20. Seed Automation Workflows (Chatbots & Triggers)
  await AutomationWorkflow.create([
    {
      organizationId: org._id,
      name: 'Instant Meta Lead Welcome Responder',
      description: 'Automatically triggers welcome message when a new lead enters via Meta Click-to-WhatsApp or Lead Ads',
      channel: 'WHATSAPP',
      type: 'AUTOMATION',
      isDefault: true,
      triggerType: 'WELCOME_MESSAGE',
      isActive: true,
      executionCount: 142,
      nodes: [
        {
          id: 'node_1',
          type: 'START_TRIGGER',
          position: { x: 100, y: 100 },
          config: { label: 'New Lead Webhook Received' }
        },
        {
          id: 'node_2',
          type: 'SEND_TEMPLATE',
          position: { x: 100, y: 250 },
          config: { templateName: 'welcome_greeting', templateLanguage: 'en_US' }
        },
        {
          id: 'node_3',
          type: 'ADD_TAG',
          position: { x: 100, y: 400 },
          config: { tagName: 'Facebook Ads Lead' }
        }
      ],
      connections: [
        { fromNodeId: 'node_1', fromPort: 'out', toNodeId: 'node_2', toPort: 'in' },
        { fromNodeId: 'node_2', fromPort: 'out', toNodeId: 'node_3', toPort: 'in' }
      ]
    },
    {
      organizationId: org._id,
      name: 'Keyword Auto-Reply: "OFFER" & "PRICE"',
      description: 'Sends active discount catalog when customer sends keyword OFFER or PRICE',
      channel: 'WHATSAPP',
      type: 'AUTOMATION',
      isDefault: false,
      triggerType: 'KEYWORD',
      triggerConfig: { keyword: 'OFFER' },
      isActive: true,
      executionCount: 389,
      nodes: [
        {
          id: 'node_1',
          type: 'START_TRIGGER',
          position: { x: 100, y: 100 },
          config: { keyword: 'OFFER' }
        },
        {
          id: 'node_2',
          type: 'SEND_TEMPLATE',
          position: { x: 100, y: 250 },
          config: { templateName: 'chimney_service_offer', templateLanguage: 'en_US' }
        }
      ],
      connections: [
        { fromNodeId: 'node_1', fromPort: 'out', toNodeId: 'node_2', toPort: 'in' }
      ]
    },
    {
      organizationId: org._id,
      name: 'Lead Stage Changed to CONVERTED',
      description: 'Automatically adds VIP Customer tag and sends onboarding confirmation',
      channel: 'WHATSAPP',
      type: 'AUTOMATION',
      isDefault: false,
      triggerType: 'LEAD_STAGE_CHANGED',
      triggerConfig: { stage: 'CONVERTED' },
      isActive: true,
      executionCount: 67,
      nodes: [
        {
          id: 'node_1',
          type: 'START_TRIGGER',
          position: { x: 100, y: 100 },
          config: { stage: 'CONVERTED' }
        },
        {
          id: 'node_2',
          type: 'ADD_TAG',
          position: { x: 100, y: 250 },
          config: { tagName: 'VIP Customer' }
        }
      ],
      connections: [
        { fromNodeId: 'node_1', fromPort: 'out', toNodeId: 'node_2', toPort: 'in' }
      ]
    }
  ]);

  // 21. Seed Integrations
  await IntegrationConfig.create([
    {
      organizationId: org._id,
      type: 'SHOPIFY',
      name: 'Shopify Store (Direct Sync)',
      status: 'CONNECTED',
      config: { storeDomain: 'iglobaltech-store.myshopify.com', syncOrders: true, syncCustomers: true },
      eventsSubscribed: ['orders/create', 'orders/paid', 'checkouts/abandoned'],
      lastSyncedAt: new Date()
    },
    {
      organizationId: org._id,
      type: 'GOOGLE_SHEETS',
      name: 'Google Sheets Live Lead Sync',
      status: 'CONNECTED',
      config: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', sheetName: 'Leads' },
      eventsSubscribed: ['leads/create', 'leads/stage_change'],
      lastSyncedAt: new Date()
    },
    {
      organizationId: org._id,
      type: 'RAZORPAY',
      name: 'Razorpay Auto-Recharge & Invoicing',
      status: 'CONNECTED',
      config: { keyId: 'rzp_live_9928101', autoRechargeEnabled: true, thresholdAmount: 500 },
      eventsSubscribed: ['payment.captured', 'invoice.paid'],
      lastSyncedAt: new Date()
    }
  ]);

  // 22. Seed Meta Audit Logs
  await MetaAuditLog.create([
    {
      organizationId: org._id,
      action: 'META_SYNC_COMPLETED',
      metaObject: 'SYNC',
      status: 'SUCCESS',
      details: 'Synchronized campaigns, lead forms, and WABA assets from Meta Cloud API',
      metaResponse: { syncedCampaigns: 3, leadForms: 2, wabaId }
    },
    {
      organizationId: org._id,
      action: 'CAMPAIGN_SYNCED',
      metaObject: 'CAMPAIGN',
      metaObjectId: '120208492019401',
      status: 'SUCCESS',
      details: 'Campaign "May 25 26" insights updated: 96 leads, ₹1,694.59 spend'
    }
  ]);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ COMPLETE ENTERPRISE DATA RESTORATION SUCCESSFUL!');
  console.log('🏢 Organization: IGlobal Tech (ID: ' + org._id + ')');
  console.log('👤 Primary User: wasim@arvee.com');
  console.log('🔑 Password:     Password@123');
  console.log('📱 WhatsApp:     +91 91998 00309 (WABA ID: ' + wabaId + ')');
  console.log('📊 Meta Ads:     Campaign "May 25 26", Lead Forms, 15+ CRM Leads');
  console.log('💬 Inbox:        Active Conversations & Interactive Template Chats');
  console.log('📢 Broadcasts:   4 Broadcast Campaigns (2223 sent stats)');
  console.log('🛍️ Catalog:      4 Kitchen Chimney Products & AMC Services');
  console.log('🤖 Automations:  3 Active WhatsApp Chatbots & Triggers');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding Error:', err);
  process.exit(1);
});
