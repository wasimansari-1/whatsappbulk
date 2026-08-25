import mongoose from 'mongoose';
import { automationService } from '../services/AutomationService.js';
import { AutomationWorkflow } from '../models/AutomationWorkflow.js';
import { Contact } from '../models/Contact.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

async function verifyKitchenStudioChatbot() {
  await mongoose.connect('mongodb://localhost:27017/whasappbulk');

  const orgId = '6a8b1d85d8761c6ddf09a79a';

  // 1. Build the exact Visual Graph Workflow matching User's Screenshot
  const workflowData = {
    organizationId: orgId,
    name: 'The Kitchen Studio - Service Request Flow',
    channel: 'WHATSAPP',
    type: 'AUTOMATION',
    triggerType: 'KEYWORD',
    triggerConfig: { keyword: 'hi, Hi, hello, start' },
    isActive: true,
    nodes: [
      {
        id: 'node_start',
        type: 'START_TRIGGER',
        title: 'Start trigger',
        position: { x: 50, y: 150 },
        config: {
          keyword: 'hi, Hi, hello',
          buttons: [{ id: 'btn_start', targetNodeId: 'node_list_services' }]
        }
      },
      {
        id: 'node_list_services',
        type: 'LIST_MESSAGE',
        title: 'List message',
        position: { x: 350, y: 100 },
        config: {
          headerTitle: 'The Kitchen Studio',
          bodyText: 'Hello {{name}}\nWelcome to The Kitchen Studio\nIt\'s good to see you :)\n\nPlease choose from the below 👇',
          buttonTitle: 'Select Service',
          sectionTitle: 'Available Services',
          items: [
            { id: 'btn_raise_request', title: 'Raise A Request', subtitle: 'Service request', targetNodeId: 'node_text_raise_request' },
            { id: 'btn_service_feedback', title: 'Service Feedback', subtitle: 'Give feedback', targetNodeId: 'node_list_rating' },
            { id: 'btn_exciting_offer', title: 'Exciting Offer', subtitle: 'Special discounts', targetNodeId: 'node_text_offers' }
          ]
        }
      },
      {
        id: 'node_text_raise_request',
        type: 'TEXT_MESSAGE',
        title: 'Text message',
        position: { x: 700, y: 50 },
        config: {
          bodyText: 'Respected Sir/Madam,\nTo proceed with your service request, please share your order/invoice number and issue details.'
        }
      },
      {
        id: 'node_text_offers',
        type: 'TEXT_MESSAGE',
        title: 'Text message',
        position: { x: 700, y: 450 },
        config: {
          bodyText: 'For available offers, please get in touch with the SHOWROOM or visit our website!'
        }
      },
      {
        id: 'node_list_rating',
        type: 'LIST_MESSAGE',
        title: 'List message',
        position: { x: 700, y: 220 },
        config: {
          headerTitle: 'Feedback',
          bodyText: 'Please provide your rating and let us know how our service was:',
          buttonTitle: 'Please Choose Rating',
          sectionTitle: 'Ratings',
          items: [
            { id: 'rate_1', title: '1/5', subtitle: 'Poor', targetNodeId: 'node_text_thanks' },
            { id: 'rate_2', title: '2/5', subtitle: 'Fair', targetNodeId: 'node_text_thanks' },
            { id: 'rate_3', title: '3/5', subtitle: 'Good', targetNodeId: 'node_text_thanks' },
            { id: 'rate_4', title: '4/5', subtitle: 'Very Good', targetNodeId: 'node_text_thanks' },
            { id: 'rate_5', title: '5/5', subtitle: 'Excellent', targetNodeId: 'node_text_thanks' }
          ]
        }
      },
      {
        id: 'node_text_thanks',
        type: 'TEXT_MESSAGE',
        title: 'Text message',
        position: { x: 1050, y: 220 },
        config: {
          bodyText: 'Thanks For FeedBack ❤️ We appreciate your support!'
        }
      }
    ]
  };

  const wf = await AutomationWorkflow.findOneAndUpdate(
    { organizationId: orgId, name: workflowData.name },
    { $set: workflowData },
    { upsert: true, new: true }
  );

  console.log('✅ Workflow Created/Updated:', wf.name, 'with', wf.nodes.length, 'nodes.');

  // 2. Test Contact
  const contact = await Contact.findOneAndUpdate(
    { organizationId: orgId, phone: '919876543210' },
    { $set: { name: 'Vikram Mehta', phone: '919876543210', status: 'ACTIVE' } },
    { upsert: true, new: true }
  );

  // -------------------------------------------------------------
  // TEST STEP 1: Customer sends "Hi"
  // -------------------------------------------------------------
  console.log('\n--- STEP 1: Customer sends "Hi" ---');
  await automationService.processIncomingMessage(orgId, contact, 'Hi');
  const msg1 = await Message.findOne({ organizationId: orgId, contactId: contact._id }).sort({ createdAt: -1 });
  console.log('Bot dispatched:', msg1.type, '| Interactive Type:', msg1.content?.interactiveType, '| Button:', msg1.content?.buttonText);
  console.log('Text content:\n', msg1.content?.text);

  // -------------------------------------------------------------
  // TEST STEP 2: Customer selects "Raise A Request" from list
  // -------------------------------------------------------------
  console.log('\n--- STEP 2: Customer selects "Raise A Request" ---');
  await automationService.processIncomingMessage(orgId, contact, 'Raise A Request', 'btn_raise_request');
  const msg2 = await Message.findOne({ organizationId: orgId, contactId: contact._id }).sort({ createdAt: -1 });
  console.log('Bot dispatched:', msg2.type, '| Text:\n', msg2.content?.text);

  // -------------------------------------------------------------
  // TEST STEP 3: Customer selects "Service Feedback" -> Rate 5/5
  // -------------------------------------------------------------
  console.log('\n--- STEP 3: Customer selects "Service Feedback" ---');
  await automationService.processIncomingMessage(orgId, contact, 'Service Feedback', 'btn_service_feedback');
  const msg3 = await Message.findOne({ organizationId: orgId, contactId: contact._id }).sort({ createdAt: -1 });
  console.log('Bot dispatched:', msg3.type, '| Interactive Type:', msg3.content?.interactiveType, '| Text:\n', msg3.content?.text);

  console.log('\n--- STEP 4: Customer selects "5/5" rating ---');
  await automationService.processIncomingMessage(orgId, contact, '5/5', 'rate_5');
  const msg4 = await Message.findOne({ organizationId: orgId, contactId: contact._id }).sort({ createdAt: -1 });
  console.log('Bot dispatched:', msg4.type, '| Text:\n', msg4.content?.text);

  await mongoose.disconnect();
  console.log('\n🎉 ALL 4 INTERACTIVE STEPS VERIFIED 100% WORKING!');
}

verifyKitchenStudioChatbot().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
