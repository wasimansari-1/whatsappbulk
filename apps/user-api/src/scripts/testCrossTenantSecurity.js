import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_enterprise_whatsapp_saas_2026_production_grade';

async function runTenantSecurityTest() {
  await mongoose.connect(MONGO_URI);
  console.log('[Test] Connected to MongoDB');

  const { AutomationWorkflow } = await import('../models/AutomationWorkflow.js');
  const { Conversation } = await import('../models/Conversation.js');
  const { Contact } = await import('../models/Contact.js');
  const { Organization } = await import('../models/Organization.js');
  const { User } = await import('../models/User.js');
  const { OrganizationMember } = await import('../models/OrganizationMember.js');

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  // Create Tenant A & Tenant B
  const orgA = await Organization.create({ name: 'Security Test Org A', slug: `test-org-a-${Date.now()}`, ownerId: userAId });
  const orgB = await Organization.create({ name: 'Security Test Org B', slug: `test-org-b-${Date.now()}`, ownerId: userBId });

  const userA = await User.create({
    _id: userAId,
    name: 'User A',
    email: `usera_${Date.now()}@test.com`,
    password: 'Password123!',
    currentOrganizationId: orgA._id
  });
  await OrganizationMember.create({ organizationId: orgA._id, userId: userA._id, role: 'ADMIN', status: 'ACTIVE' });

  const userB = await User.create({
    _id: userBId,
    name: 'User B',
    email: `userb_${Date.now()}@test.com`,
    password: 'Password123!',
    currentOrganizationId: orgB._id
  });
  await OrganizationMember.create({ organizationId: orgB._id, userId: userB._id, role: 'ADMIN', status: 'ACTIVE' });

  // Create resources under Tenant B
  const wfB = await AutomationWorkflow.create({
    organizationId: orgB._id,
    name: 'Tenant B Secret Flow',
    nodes: []
  });

  const contactB = await Contact.create({
    organizationId: orgB._id,
    name: 'Tenant B Secret Contact',
    phone: '919999988888'
  });

  const convB = await Conversation.create({
    organizationId: orgB._id,
    contactId: contactB._id,
    lastMessage: { text: 'Secret message from B' }
  });

  // Generate JWT for User A (Tenant A)
  const tokenA = jwt.sign({ userId: userA._id }, JWT_SECRET, { expiresIn: '1h' });

  const BASE_URL = 'http://localhost:5001/api/v1';

  console.log('\n--- EXECUTING CROSS-TENANT SECURITY TESTS ---\n');

  // Test 1: Tenant A -> Tenant B Workflow GET
  try {
    const res1 = await fetch(`${BASE_URL}/automation/${wfB._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log(`1. Tenant A -> Tenant B Workflow GET: HTTP ${res1.status} | Body: ${await res1.text()}`);
  } catch (e) {
    console.log(`1. Error: ${e.message}`);
  }

  // Test 2: Tenant A -> Tenant B Workflow UPDATE
  try {
    const res2 = await fetch(`${BASE_URL}/automation/${wfB._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked by Tenant A' })
    });
    console.log(`2. Tenant A -> Tenant B Workflow UPDATE: HTTP ${res2.status} | Body: ${await res2.text()}`);
  } catch (e) {
    console.log(`2. Error: ${e.message}`);
  }

  // Test 3: Tenant A -> Tenant B Workflow DELETE
  try {
    const res3 = await fetch(`${BASE_URL}/automation/${wfB._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log(`3. Tenant A -> Tenant B Workflow DELETE: HTTP ${res3.status} | Body: ${await res3.text()}`);
  } catch (e) {
    console.log(`3. Error: ${e.message}`);
  }

  // Verify Workflow in DB is untouched
  const wfBAfter = await AutomationWorkflow.findById(wfB._id);
  console.log(`   -> DB Verification: Tenant B Workflow name is still "${wfBAfter?.name}" (Exists: ${!!wfBAfter})`);

  // Test 4: Tenant A -> Tenant B Conversation GET
  try {
    const res4 = await fetch(`${BASE_URL}/conversations/${convB._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log(`4. Tenant A -> Tenant B Conversation GET: HTTP ${res4.status} | Body: ${await res4.text()}`);
  } catch (e) {
    console.log(`4. Error: ${e.message}`);
  }

  // Test 5: Tenant A -> Tenant B Contact GET
  try {
    const res5 = await fetch(`${BASE_URL}/contacts/${contactB._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log(`5. Tenant A -> Tenant B Contact GET: HTTP ${res5.status} | Body: ${await res5.text()}`);
  } catch (e) {
    console.log(`5. Error: ${e.message}`);
  }

  // Clean up test data
  await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
  await OrganizationMember.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
  await AutomationWorkflow.deleteMany({ _id: wfB._id });
  await Contact.deleteMany({ _id: contactB._id });
  await Conversation.deleteMany({ _id: convB._id });

  await mongoose.disconnect();
  console.log('\n[Test Complete] Security tests finished and test data cleaned.');
}

runTenantSecurityTest();
