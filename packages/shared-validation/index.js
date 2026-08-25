import { z } from 'zod';
import { 
  UserRole, 
  TemplateCategory, 
  LeadStage, 
  BillingInterval, 
  ChannelType 
} from '@whatsapp-saas/shared-constants';

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

// Contact Schemas
export const createContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(100),
  phone: z.string().min(8, 'Valid phone number with country code is required'),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string()).default({}),
  assignedTo: z.string().optional()
});

export const updateContactSchema = createContactSchema.partial();

export const bulkContactActionSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'Select at least one contact'),
  action: z.enum(['ADD_TAGS', 'REMOVE_TAGS', 'ASSIGN_USER', 'CONVERT_TO_LEAD', 'DELETE']),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  leadStage: z.nativeEnum(LeadStage).optional()
});

// Lead Schemas
export const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string().default('WhatsApp'),
  stage: z.nativeEnum(LeadStage).default(LeadStage.NEW),
  dealValue: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  assignedTo: z.string().optional()
});

export const updateLeadSchema = createLeadSchema.partial();

// Template Schemas
export const templateComponentSchema = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']),
  format: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION']).optional(),
  text: z.string().optional(),
  example: z.record(z.any()).optional(),
  buttons: z.array(z.object({
    type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
    text: z.string(),
    url: z.string().optional(),
    phone_number: z.string().optional()
  })).optional()
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Template name must contain only lowercase letters, numbers, and underscores'),
  category: z.nativeEnum(TemplateCategory),
  language: z.string().default('en_US'),
  components: z.array(templateComponentSchema).min(1, 'Template must have at least a BODY component')
});

// Campaign Schemas
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(150),
  channel: z.nativeEnum(ChannelType).default(ChannelType.WHATSAPP),
  whatsappPhoneNumberId: z.string().optional().nullable(),
  templateId: z.string().min(1, 'Template selection is required'),
  templateName: z.string().optional(),
  audienceType: z.enum(['ALL', 'TAGS', 'LISTS', 'CUSTOM']).default('ALL'),
  targetTag: z.string().optional(),
  targetTags: z.array(z.string()).default([]),
  targetListIds: z.array(z.string()).default([]),
  variableMapping: z.record(z.string()).default({}),
  scheduleDate: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  sendSpeedPerMinute: z.number().int().positive().default(60)
});

// Plan & Billing Schemas
export const createPlanSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().default('INR'),
  billingInterval: z.nativeEnum(BillingInterval).default(BillingInterval.MONTHLY),
  maxUsers: z.number().int().positive().default(5),
  maxContacts: z.number().int().positive().default(2500),
  maxWhatsAppNumbers: z.number().int().positive().default(1),
  monthlyMessageLimit: z.number().int().positive().default(5000),
  maxCampaigns: z.number().int().positive().default(50),
  features: z.object({
    automationEnabled: z.boolean().default(false),
    analyticsEnabled: z.boolean().default(true),
    apiEnabled: z.boolean().default(false),
    teamInboxEnabled: z.boolean().default(true),
    crmEnabled: z.boolean().default(true)
  }),
  supportLevel: z.string().default('Standard')
});

export const addWalletCreditsSchema = z.object({
  amount: z.number().positive('Credit amount must be greater than 0'),
  paymentMethod: z.string().default('ONLINE')
});
