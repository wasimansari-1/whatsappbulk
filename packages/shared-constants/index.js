/**
 * Enterprise Constants & Enums for WhatsApp SaaS Platform
 */

export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  VIEWER: 'VIEWER'
};

export const AdminRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OPERATIONS_ADMIN: 'OPERATIONS_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN'
};

export const Permissions = {
  // Users & Team
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  USERS_SUSPEND: 'users.suspend',
  TEAM_MANAGE: 'team.manage',

  // Campaigns
  CAMPAIGNS_READ: 'campaigns.read',
  CAMPAIGNS_CREATE: 'campaigns.create',
  CAMPAIGNS_SEND: 'campaigns.send',
  CAMPAIGNS_PAUSE: 'campaigns.pause',
  CAMPAIGNS_DELETE: 'campaigns.delete',

  // Contacts
  CONTACTS_READ: 'contacts.read',
  CONTACTS_WRITE: 'contacts.write',
  CONTACTS_IMPORT: 'contacts.import',
  CONTACTS_EXPORT: 'contacts.export',
  CONTACTS_DELETE: 'contacts.delete',

  // Leads CRM
  LEADS_READ: 'leads.read',
  LEADS_WRITE: 'leads.write',
  LEADS_DELETE: 'leads.delete',

  // WhatsApp
  WHATSAPP_READ: 'whatsapp.read',
  WHATSAPP_CONNECT: 'whatsapp.connect',
  WHATSAPP_MANAGE: 'whatsapp.manage',

  // Templates
  TEMPLATES_READ: 'templates.read',
  TEMPLATES_CREATE: 'templates.create',
  TEMPLATES_EDIT: 'templates.edit',
  TEMPLATES_DELETE: 'templates.delete',

  // Inbox & Chat
  INBOX_READ: 'inbox.read',
  INBOX_SEND: 'inbox.send',
  INBOX_ASSIGN: 'inbox.assign',

  // Automation
  AUTOMATION_READ: 'automation.read',
  AUTOMATION_MANAGE: 'automation.manage',

  // Billing
  BILLING_READ: 'billing.read',
  BILLING_MANAGE: 'billing.manage',

  // Analytics & Settings
  ANALYTICS_READ: 'analytics.read',
  SETTINGS_MANAGE: 'settings.manage',
  API_KEYS_MANAGE: 'api_keys.manage'
};

export const RolePermissions = {
  [UserRole.OWNER]: Object.values(Permissions),
  [UserRole.ADMIN]: Object.values(Permissions).filter(
    (p) => p !== Permissions.USERS_SUSPEND
  ),
  [UserRole.MANAGER]: [
    Permissions.CAMPAIGNS_READ,
    Permissions.CAMPAIGNS_CREATE,
    Permissions.CAMPAIGNS_SEND,
    Permissions.CAMPAIGNS_PAUSE,
    Permissions.CONTACTS_READ,
    Permissions.CONTACTS_WRITE,
    Permissions.CONTACTS_IMPORT,
    Permissions.CONTACTS_EXPORT,
    Permissions.LEADS_READ,
    Permissions.LEADS_WRITE,
    Permissions.TEMPLATES_READ,
    Permissions.TEMPLATES_CREATE,
    Permissions.INBOX_READ,
    Permissions.INBOX_SEND,
    Permissions.INBOX_ASSIGN,
    Permissions.ANALYTICS_READ,
    Permissions.WHATSAPP_READ
  ],
  [UserRole.AGENT]: [
    Permissions.CONTACTS_READ,
    Permissions.CONTACTS_WRITE,
    Permissions.LEADS_READ,
    Permissions.LEADS_WRITE,
    Permissions.INBOX_READ,
    Permissions.INBOX_SEND,
    Permissions.CAMPAIGNS_READ,
    Permissions.TEMPLATES_READ
  ],
  [UserRole.VIEWER]: [
    Permissions.CAMPAIGNS_READ,
    Permissions.CONTACTS_READ,
    Permissions.LEADS_READ,
    Permissions.INBOX_READ,
    Permissions.TEMPLATES_READ,
    Permissions.ANALYTICS_READ
  ]
};

export const CampaignStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'
};

export const MessageStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
};

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  AUDIO: 'AUDIO',
  TEMPLATE: 'TEMPLATE',
  INTERACTIVE: 'INTERACTIVE',
  LOCATION: 'LOCATION',
  CONTACTS: 'CONTACTS'
};

export const TemplateCategory = {
  MARKETING: 'MARKETING',
  UTILITY: 'UTILITY',
  AUTHENTICATION: 'AUTHENTICATION'
};

export const TemplateStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED'
};

export const ChannelType = {
  WHATSAPP: 'WHATSAPP',
  INSTAGRAM: 'INSTAGRAM',
  MESSENGER: 'MESSENGER'
};

export const LeadStage = {
  NEW: 'NEW',
  FOLLOW_UPS: 'FOLLOW_UPS',
  HOT: 'HOT',
  IN_PROGRESS: 'IN_PROGRESS',
  CONVERTED: 'CONVERTED',
  DISQUALIFIED: 'DISQUALIFIED'
};

export const SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  GRACE_PERIOD: 'GRACE_PERIOD',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED'
};

export const BillingInterval = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
};

export const WebhookEventType = {
  MESSAGE_STATUS: 'MESSAGE_STATUS',
  INCOMING_MESSAGE: 'INCOMING_MESSAGE',
  TEMPLATE_STATUS: 'TEMPLATE_STATUS',
  PHONE_NUMBER_QUALITY: 'PHONE_NUMBER_QUALITY',
  ACCOUNT_UPDATE: 'ACCOUNT_UPDATE'
};

export const AuditAction = {
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  CAMPAIGN_CREATE: 'CAMPAIGN_CREATE',
  CAMPAIGN_LAUNCH: 'CAMPAIGN_LAUNCH',
  CAMPAIGN_PAUSE: 'CAMPAIGN_PAUSE',
  CAMPAIGN_CANCEL: 'CAMPAIGN_CANCEL',
  CAMPAIGN_DELETE: 'CAMPAIGN_DELETE',
  TEMPLATE_CREATE: 'TEMPLATE_CREATE',
  TEMPLATE_SUBMIT: 'TEMPLATE_SUBMIT',
  TEMPLATE_DELETE: 'TEMPLATE_DELETE',
  CONTACT_IMPORT: 'CONTACT_IMPORT',
  CONTACT_EXPORT: 'CONTACT_EXPORT',
  CONTACT_DELETE: 'CONTACT_DELETE',
  WHATSAPP_CONNECT: 'WHATSAPP_CONNECT',
  WHATSAPP_DISCONNECT: 'WHATSAPP_DISCONNECT',
  PLAN_CHANGE: 'PLAN_CHANGE',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  USER_SUSPEND: 'USER_SUSPEND',
  API_KEY_CREATE: 'API_KEY_CREATE'
};

export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ENTITLEMENT_EXCEEDED: 'ENTITLEMENT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
