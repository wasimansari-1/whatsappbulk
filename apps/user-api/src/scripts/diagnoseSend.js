import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function diagnose() {
  await mongoose.connect('mongodb://localhost:27017/whasappbulk');
  const { getWhatsAppProvider } = await import('../providers/whatsapp/index.js');
  const provider = getWhatsAppProvider();

  try {
    const res = await provider.sendTextMessage({
      phoneNumberId: '1252085087993302',
      to: '918292463648',
      text: 'Diagnostic pre-production test message'
    }, process.env.WHATSAPP_ACCESS_TOKEN);
    console.log('Direct Meta Send Result:', res);
  } catch (err) {
    console.log('Direct Meta Send Error:', err.message);
  }

  await mongoose.disconnect();
}

diagnose();
