import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function listWorkflows() {
  await mongoose.connect(MONGO_URI);
  const { AutomationWorkflow } = await import('../models/AutomationWorkflow.js');
  const { Organization } = await import('../models/Organization.js');

  const orgs = await Organization.find({}).lean();
  console.log('--- ALL ORGANIZATIONS ---');
  for (const org of orgs) {
    console.log(`Org: ${org.name} | ID: ${org._id}`);
  }

  const workflows = await AutomationWorkflow.find({}).lean();
  console.log('\n--- ALL AUTOMATION WORKFLOWS ---');
  for (const wf of workflows) {
    console.log(`\nWorkflow: "${wf.name}" | ID: ${wf._id} | Org: ${wf.organizationId} | Active: ${wf.isActive} | Trigger: ${wf.triggerType}`);
    console.log('TriggerConfig:', wf.triggerConfig);
    console.log('Nodes count:', wf.nodes?.length);
    wf.nodes?.forEach((n, idx) => {
      console.log(`  Node ${idx + 1}: ${n.type} (${n.id}) - Title: ${n.title || n.config?.headerTitle || ''} - Text: ${n.config?.bodyText || n.config?.text || ''}`);
    });
  }

  await mongoose.disconnect();
}

listWorkflows();
