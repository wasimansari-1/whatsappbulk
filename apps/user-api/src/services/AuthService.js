import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { Plan } from '../models/Plan.js';
import { Subscription } from '../models/Subscription.js';
import { Wallet } from '../models/Wallet.js';
import { WhatsAppAccount } from '../models/WhatsAppAccount.js';
import { WhatsAppPhoneNumber } from '../models/WhatsAppPhoneNumber.js';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate.js';
import { UserRole, TemplateCategory, TemplateStatus, SubscriptionStatus } from '@whatsapp-saas/shared-constants';

export class AuthService {
  generateTokens(user, organizationId) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: organizationId ? organizationId.toString() : null
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'super_secret_jwt_key_enterprise_whatsapp_saas_2026_production_grade',
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_enterprise_whatsapp_saas_2026',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }

  async register({ name, email, password, organizationName, phone }) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const error = new Error('A user with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // 1. Create User
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone
    });
    await user.save();

    // 2. Generate slug for Organization
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    
    // Find default Starter plan or create fallback
    let defaultPlan = await Plan.findOne({ slug: 'starter' });
    if (!defaultPlan) {
      defaultPlan = await Plan.create({
        name: 'Starter Trial',
        slug: 'starter',
        price: 0,
        maxUsers: 5,
        maxContacts: 2500,
        monthlyMessageLimit: 2000
      });
    }

    // 3. Create Organization
    const organization = await Organization.create({
      name: organizationName,
      slug,
      ownerId: user._id,
      planId: defaultPlan._id,
      status: 'ACTIVE'
    });

    // 4. Create Membership as OWNER
    await OrganizationMember.create({
      organizationId: organization._id,
      userId: user._id,
      role: UserRole.OWNER,
      status: 'ACTIVE'
    });

    // 5. Create Subscription
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 14); // 14-day trial
    await Subscription.create({
      organizationId: organization._id,
      planId: defaultPlan._id,
      status: SubscriptionStatus.TRIAL,
      currentPeriodEnd: periodEnd,
      trialEndsAt: periodEnd
    });

    // 6. Initialize Wallet with initial complimentary credits (₹500)
    await Wallet.create({
      organizationId: organization._id,
      balance: 500.0,
      usedCredits: 0.0
    });

    // 7. Initialize default WhatsApp Account and Phone Number (Mock connected)
    const waba = await WhatsAppAccount.create({
      organizationId: organization._id,
      name: `${organizationName} WABA`,
      wabaId: `waba_${Date.now()}`,
      provider: 'MOCK',
      status: 'CONNECTED'
    });

    await WhatsAppPhoneNumber.create({
      organizationId: organization._id,
      whatsappAccountId: waba._id,
      phoneNumberId: `phone_id_${Date.now()}`,
      displayPhoneNumber: phone || '+91 87009 94288',
      verifiedName: organizationName,
      status: 'CONNECTED',
      qualityRating: 'GREEN'
    });

    // 8. Seed standard starter templates for the tenant
    await WhatsAppTemplate.create([
      {
        organizationId: organization._id,
        whatsappAccountId: waba._id,
        name: 'welcome_greeting',
        category: TemplateCategory.MARKETING,
        language: 'en_US',
        status: TemplateStatus.APPROVED,
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Welcome to {{1}}! 🎉'
          },
          {
            type: 'BODY',
            text: 'Hi {{2}}, thank you for connecting with us! Explore our catalog and exclusive offers.'
          },
          {
            type: 'FOOTER',
            text: 'Reply STOP to opt out'
          },
          {
            type: 'BUTTONS',
            buttons: [
              { type: 'QUICK_REPLY', text: 'View Catalog' },
              { type: 'QUICK_REPLY', text: 'Chat with Agent' }
            ]
          }
        ]
      },
      {
        organizationId: organization._id,
        whatsappAccountId: waba._id,
        name: 'order_status_update',
        category: TemplateCategory.UTILITY,
        language: 'en_US',
        status: TemplateStatus.APPROVED,
        components: [
          {
            type: 'BODY',
            text: 'Hello {{1}}, your order #{{2}} is now out for delivery. Track it live here: {{3}}'
          }
        ]
      }
    ]);

    // Update current org on user
    user.currentOrganizationId = organization._id;
    await user.save();

    const tokens = this.generateTokens(user, organization._id);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      },
      tokens
    };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Fetch user organizations
    const memberships = await OrganizationMember.find({ userId: user._id, status: 'ACTIVE' })
      .populate('organizationId')
      .lean();

    const activeOrg = memberships[0]?.organizationId || null;

    const tokens = this.generateTokens(user, activeOrg?._id);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        currentOrganizationId: activeOrg?._id
      },
      organizations: memberships.map((m) => ({
        id: m.organizationId._id,
        name: m.organizationId.name,
        role: m.role
      })),
      tokens
    };
  }

  async refreshToken(token) {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_enterprise_whatsapp_saas_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, jwtRefreshSecret);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user || user.status === 'SUSPENDED') {
      const error = new Error('User not found or suspended');
      error.statusCode = 401;
      throw error;
    }

    const tokens = this.generateTokens(user, decoded.organizationId);
    return tokens;
  }
}

export const authService = new AuthService();
export default authService;
