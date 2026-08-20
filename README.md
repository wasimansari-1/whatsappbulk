# Wappbíz - Enterprise WhatsApp Business Platform SaaS

A production-grade, multi-tenant commercial SaaS platform for official WhatsApp Business marketing campaigns, team inbox, CRM leads pipeline, template approvals, campaign automation, usage metering, and subscription billing.

---

## 🌟 Key Features

- **Multi-Tenant Architecture**: Strict tenant isolation on every layer via `organizationId` scoping.
- **Provider Abstraction**: Full support for official Meta WhatsApp Cloud API v20.0+ with an offline-capable `MockWhatsAppProvider` for instant local development.
- **Real-Time Team Inbox**: Multi-channel conversation support (WhatsApp, Instagram, Messenger) with rich WhatsApp interactive template bubbles, quick replies, delivery double-checks, and agent assignment.
- **Customer & Contact Management**: Advanced segmentation by tags, high-performance streaming CSV imports, and floating multi-select bulk action toolbar (*Assign, Convert to Lead, Add/Remove Tags, Broadcast, Export*).
- **Leads CRM Pipeline**: Stage tracking (*New, Follow Ups, Hot, In Progress, Converted, Disqualified*) with aggregated stage counters.
- **9-Step Broadcast Campaign Wizard**: Multi-step wizard supporting audience filtering, variable mapping, live mobile preview, rate-limiting, and real-time Socket.IO progress tracking (*Queued, Sent, Delivered, Read, Failed*).
- **Prepaid Wallet & Subscriptions**: Database-driven tier management with prepaid messaging credit balances (*e.g. ₹0.40/marketing msg*) and transaction logging.
- **Distributed Queue Processing**: BullMQ queues backed by Redis with exponential backoff, worker concurrency, and idempotent execution.
- **SuperAdmin Governance Portal**: Multi-tenant metrics, MRR tracking, plan editor, queue health monitoring, and system audit logs.

---

## 🏗️ Architecture Overview

```
root/
├── apps/
│   ├── user-web/       # User React 18 + Vite + Tailwind CSS portal (:3000)
│   ├── admin-web/      # SuperAdmin Governance React 18 + Vite portal (:3001)
│   ├── user-api/       # Core Express + Mongoose + BullMQ + Socket.IO (:5001)
│   └── admin-api/      # Admin Express backend (:5002)
├── packages/
│   ├── shared-constants/   # Roles, Permissions, Campaign & Message Status Enums
│   ├── shared-validation/  # Shared Zod validation schemas
│   └── shared-utils/       # Phone sanitization, cursor pagination, helpers
├── docker-compose.yml       # MongoDB 7 & Redis 7 container configuration
└── .env.example            # Master environment configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose (for local MongoDB & Redis)

### 2. Start Infrastructure
```bash
# Start MongoDB (27017) and Redis (6379)
docker-compose up -d
```

### 3. Setup Environment
```bash
cp .env.example .env
npm install
```

### 4. Seed Database with Demo Enterprise Workspace
```bash
npm run seed
```
> **Pre-populated Demo Account**:
> - **Email**: `wasim@arvee.com`
> - **Password**: `Password@123`
> - **Workspace**: `Arvee Appliances` (Pre-configured with ₹517.65 wallet balance, approved templates, 10+ customers, CRM leads, and active conversations).

### 5. Run Applications in Development Mode
```bash
npm run dev
```

| Service | URL |
| :--- | :--- |
| **User SaaS Portal** | `http://localhost:3000` |
| **Admin Portal** | `http://localhost:3001` |
| **User API** | `http://localhost:5001` |
| **Admin API** | `http://localhost:5002` |

---

## 🔌 Switching from Mock Provider to Production Meta WhatsApp API

In `.env`, set:
```env
WHATSAPP_PROVIDER=meta
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_ACCESS_TOKEN=your_system_user_permanent_token
META_BUSINESS_ID=your_business_manager_id
META_WABA_ID=your_waba_id
META_PHONE_NUMBER_ID=your_phone_number_id
META_WEBHOOK_VERIFY_TOKEN=your_secure_verify_token
META_API_VERSION=v20.0
```
When running in development with `WHATSAPP_PROVIDER=mock`, the system will smoothly emulate template message dispatch, delivery receipts (`SENT` -> `DELIVERED` -> `READ`), and customer replies without needing active Meta credentials.

---

## 🧪 Automated Testing

```bash
npm run test --workspace=apps/user-api
```
Includes tests for:
- Tenant isolation and repository scoping
- Mock WhatsApp provider message dispatch and webhook payload normalization
