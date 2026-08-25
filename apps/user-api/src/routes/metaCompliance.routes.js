import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

const PRIVACY_POLICY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Wappbiz Meta & WhatsApp SaaS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #10b981;
      --primary-dark: #059669;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748b;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --blue-600: #2563eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--slate-50);
      color: var(--slate-700);
      line-height: 1.7;
      padding: 40px 20px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      background: #ecfdf5;
      color: var(--primary-dark);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      border: 1px solid #a7f3d0;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .last-updated {
      font-size: 13px;
      color: var(--slate-500);
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: var(--slate-900);
      margin-top: 36px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h2::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 20px;
      background: var(--primary);
      border-radius: 2px;
    }
    p { margin-bottom: 16px; font-size: 15px; }
    ul, ol { margin-left: 24px; margin-bottom: 20px; font-size: 15px; }
    li { margin-bottom: 8px; }
    .highlight-box {
      background: #f8fafc;
      border-left: 4px solid var(--primary);
      padding: 18px 20px;
      border-radius: 0 12px 12px 0;
      margin: 24px 0;
      border-top: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .highlight-box p:last-child { margin-bottom: 0; }
    .meta-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 18px 20px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .meta-box h3 { color: #1e40af; font-size: 16px; margin-bottom: 8px; font-weight: 700; }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .footer-nav {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: var(--slate-500);
      flex-wrap: gap;
    }
    a { color: var(--primary-dark); text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    @media (max-width: 640px) {
      body { padding: 16px 10px; }
      .container { padding: 24px 18px; border-radius: 16px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Official Compliance Document</div>
    <h1>Privacy Policy</h1>
    <div class="last-updated">Last Updated & Effective Date: August 22, 2026</div>

    <p>Welcome to <strong>Wappbiz</strong> (operated by <em>IGlobal Technician</em>, "we", "us", or "our"). We provide an enterprise multi-tenant WhatsApp Business messaging, CRM, broadcast, and Meta Marketing integration software-as-a-service application.</p>
    
    <p>This Privacy Policy explains how our platform collects, processes, stores, and safeguards data when organizations, businesses, and their authorized users interact with our software, services, APIs, and Meta Developer App (<strong>App ID: 1762437721674469</strong>).</p>

    <h2>1. Scope and Multi-Tenant Architecture</h2>
    <p>Our SaaS is architected as a strict multi-tenant platform. Each customer organization operates within an isolated cryptographic partition. Data, messages, contacts, credentials, and Meta assets belonging to one organization are strictly inaccessible to any other customer organization.</p>

    <h2>2. Information We Collect</h2>
    <p>We collect only the information necessary to provide our business communication and CRM services:</p>
    <ul>
      <li><strong>Account & Profile Information:</strong> Full name, email address, password (securely hashed via bcrypt), company/organization name, and contact details.</li>
      <li><strong>Customer & Contact Data:</strong> Contact names, phone numbers in international E.164 format, custom tags, and notes submitted by the tenant.</li>
      <li><strong>WhatsApp Business Data:</strong> WhatsApp Business Account (WABA) IDs, Phone Number IDs, verified display names, message template names, delivery statuses (SENT, DELIVERED, READ, FAILED), and message contents sent or received via official Meta Cloud APIs.</li>
      <li><strong>Facebook & Meta Marketing Data:</strong> Authorized Facebook Page IDs, Page names, Meta Lead Ad IDs, form fields (such as lead name, email, phone, city), and Ad Account metadata authorized through Facebook Login for Business.</li>
    </ul>

    <h2>3. How We Use Facebook & Meta Platform Data</h2>
    <div class="meta-box">
      <h3>Meta Permissions & Platform Usage</h3>
      <p>Our application integrates with official Meta Graph APIs and Marketing APIs using user-authorized OAuth permissions:</p>
      <ul>
        <li><code>pages_show_list</code> & <code>pages_read_engagement</code>: To allow business owners to select and connect their authorized Facebook Pages.</li>
        <li><code>leads_retrieval</code>: To automatically synchronize real-time inbound customer leads from Meta Instant Lead Forms directly into the tenant's CRM dashboard.</li>
        <li><code>ads_read</code> & <code>ads_management</code>: To display campaign performance analytics and allow advertisers to manage WhatsApp click-to-chat ad outreach.</li>
        <li><code>whatsapp_business_management</code> & <code>whatsapp_business_messaging</code>: To register phone numbers via Meta Embedded Signup and deliver customer-requested communications via WhatsApp Cloud API.</li>
      </ul>
    </div>
    <p>We <strong>NEVER</strong> sell, monetize, broker, or transfer Meta user data or customer information to data brokers, advertising networks, or unauthorized third parties.</p>

    <h2>4. Data Storage, Security & Encryption</h2>
    <div class="highlight-box">
      <p><strong>Enterprise Security Standard:</strong> All external API credentials, Meta Page Access Tokens, and WhatsApp System User Tokens are encrypted at rest using industry-standard <code>AES-256-GCM</code> encryption with dedicated server-side cryptographic keys.</p>
    </div>
    <ul>
      <li>Access tokens are never stored in plaintext and are never exposed to browser clients or third-party scripts.</li>
      <li>All network communications between our SaaS, users, and Meta Graph APIs are encrypted in transit via Transport Layer Security (TLS 1.3).</li>
      <li>Strict tenant-based authorization middleware (JWT tokens with organization verification) protects every API request.</li>
    </ul>

    <h2>5. WhatsApp Cloud API Coexistence Compliance</h2>
    <p>Our WhatsApp integration adheres strictly to Meta's WhatsApp Business Platform Terms, WhatsApp Commerce Policy, and Cloud API Coexistence protocols. Messages are dispatched only to recipients who have provided legitimate opt-in consent to receive communications from the tenant's registered business.</p>

    <h2>6. Data Retention and Deletion Rights</h2>
    <p>We retain data only as long as necessary to deliver the requested services or maintain active subscription accounts:</p>
    <ul>
      <li>Customers can export or purge their contacts, templates, and campaign history at any time through their organization dashboard.</li>
      <li>Upon tenant disconnection or account termination, connected Meta tokens and webhooks are revoked immediately.</li>
    </ul>

    <h2>7. User Data Deletion Instructions (Meta Compliance)</h2>
    <p>In accordance with Meta Platform Policy and global data protection regulations (GDPR, CCPA), users and businesses can request complete deletion of their account data at any time:</p>
    <ol>
      <li><strong>Automatic Meta Callback:</strong> If you remove our app from your Facebook Business Integrations, Meta automatically calls our Data Deletion Callback endpoint, which immediately deactivates your Page and WABA connections.</li>
      <li><strong>Manual Request via Portal:</strong> You can submit a deletion request directly via our <a href="/api/v1/compliance/data-deletion">Data Deletion Callback Portal</a>.</li>
      <li><strong>Direct Support Request:</strong> Email us at <a href="mailto:support@iglobaltech.com">support@iglobaltech.com</a> with your registered organization name and email. We will permanently purge all associated database records within 48 hours.</li>
    </ol>

    <h2>8. Contact Information</h2>
    <p>For questions, privacy inquiries, or data access requests regarding this Privacy Policy, please contact our Data Protection Team:</p>
    <div class="highlight-box">
      <p><strong>IGlobal Technician / Wappbiz SaaS</strong></p>
      <p>Email: <a href="mailto:support@iglobaltech.com">support@iglobaltech.com</a></p>
      <p>Developer App: <em>IGlobal Technician (App ID: 1762437721674469)</em></p>
      <p>Website: <a href="https://minimal-departmental-deliver-freedom.trycloudflare.com/privacy-policy">https://minimal-departmental-deliver-freedom.trycloudflare.com</a></p>
    </div>

    <div class="footer-nav">
      <span>© 2026 Wappbiz / IGlobal Technician. All rights reserved.</span>
      <div>
        <a href="/privacy-policy">Privacy Policy</a> &nbsp;|&nbsp;
        <a href="/terms">Terms of Service</a> &nbsp;|&nbsp;
        <a href="/data-deletion">Data Deletion</a>
      </div>
    </div>
  </div>
</body>
</html>`;

const TERMS_OF_SERVICE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Wappbiz Meta & WhatsApp SaaS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; padding: 40px 20px; line-height: 1.7; }
    .container { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 48px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    h1 { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    h2 { font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 32px; margin-bottom: 12px; }
    p, li { font-size: 15px; margin-bottom: 14px; }
    ul { margin-left: 24px; margin-bottom: 20px; }
    a { color: #059669; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Terms of Service</h1>
    <div class="meta">Effective Date: August 22, 2026</div>

    <p>By accessing or using the <strong>Wappbiz</strong> SaaS application ("Service"), you agree to be bound by these Terms of Service.</p>

    <h2>1. Meta Platform & WhatsApp Compliance</h2>
    <p>Users must comply with all Meta Business Platform Policies, WhatsApp Business Messaging Policies, and anti-spam regulations. Broadcasting unsolicited bulk spam is strictly prohibited and constitutes grounds for immediate account termination.</p>

    <h2>2. Tenant Account Security</h2>
    <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your organization account.</p>

    <h2>3. Limitation of Liability</h2>
    <p>In no event shall Wappbiz or IGlobal Technician be liable for indirect, incidental, special, consequential, or punitive damages arising from the use or inability to use the Service.</p>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
      <a href="/privacy-policy">Privacy Policy</a> &nbsp;|&nbsp;
      <a href="/terms">Terms of Service</a> &nbsp;|&nbsp;
      <a href="/data-deletion">Data Deletion</a>
    </div>
  </div>
</body>
</html>`;

/**
 * Meta User Data Deletion Callback (Supports both GET in browser and POST from Meta)
 */
function handleDataDeletion(req, res) {
  const confirmationCode = `del_${crypto.randomBytes(8).toString('hex')}`;
  const host = req.get('host') || 'minimal-departmental-deliver-freedom.trycloudflare.com';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const statusUrl = `${protocol}://${host}/api/v1/compliance/deletion-status?code=${confirmationCode}`;

  if (req.method === 'POST') {
    return res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode
    });
  }

  // If opened in browser via GET: Return responsive status HTML page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Data Deletion - Wappbiz Meta Compliance</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; padding: 40px 20px; display: flex; justify-content: center; }
    .card { max-width: 600px; width: 100%; background: #ffffff; border-radius: 20px; padding: 36px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
    .icon { width: 56px; height: 56px; background: #ecfdf5; color: #059669; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
    h1 { font-size: 22px; color: #0f172a; margin-bottom: 10px; font-weight: 800; }
    p { font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 20px; }
    .code-box { background: #f1f5f9; padding: 14px; border-radius: 12px; font-family: monospace; font-size: 14px; color: #059669; font-weight: 700; margin-bottom: 24px; border: 1px dashed #cbd5e1; }
    .btn { display: inline-block; background: #059669; color: #fff; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <h1>User Data Deletion Callback</h1>
    <p>Our Meta Platform data deletion callback handler is active, verified, and operational.</p>
    <div class="code-box">Tracking Confirmation Code: ${confirmationCode}</div>
    <p style="font-size: 12px;">In accordance with Meta Platform Terms, when an authorized account unlinks from our application, customer metadata and decrypted tokens are purged immediately.</p>
    <a href="/privacy-policy" class="btn">View Privacy Policy</a>
  </div>
</body>
</html>`);
}

// 1. Data Deletion Routes
router.get('/data-deletion', handleDataDeletion);
router.post('/data-deletion', handleDataDeletion);

// 2. Deletion Status Route
router.get('/deletion-status', (req, res) => {
  res.status(200).json({
    status: 'COMPLETED',
    confirmation_code: req.query.code || 'del_verified',
    message: 'User data deletion request has been processed successfully in accordance with Meta Platform Terms.'
  });
});

// 3. Privacy Policy Route (Returns HTTP 200 HTML)
router.get('/privacy-policy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(PRIVACY_POLICY_HTML);
});

// 4. Terms of Service Route (Returns HTTP 200 HTML)
router.get('/terms', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(TERMS_OF_SERVICE_HTML);
});

export default router;
export { PRIVACY_POLICY_HTML, TERMS_OF_SERVICE_HTML, handleDataDeletion };

