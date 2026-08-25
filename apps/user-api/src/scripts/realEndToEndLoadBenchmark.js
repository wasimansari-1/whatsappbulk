import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

async function runEndToEndBenchmark(concurrency, totalRequests) {
  const { webhookService } = await import('../services/WebhookService.js');
  const { Message } = await import('../models/Message.js');
  const { Wallet } = await import('../models/Wallet.js');

  const latencies = [];
  let successful = 0;
  let duplicatesBlocked = 0;
  let failed = 0;

  const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
  const startTime = Date.now();

  const processOne = async (index) => {
    const reqStart = Date.now();
    const wamid = `wamid.bench.${Date.now()}.${index}.${Math.random().toString(36).substring(7)}`;
    const phone = `918292463648`;

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '1066070962481909',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phone, phone_number_id: '1252085087993302' },
                contacts: [{ profile: { name: `Load User ${index}` }, wa_id: phone }],
                messages: [
                  {
                    from: phone,
                    id: wamid,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: { body: 'hi' },
                    type: 'text'
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    try {
      const result = await webhookService.processIncomingWebhook(payload, null, {});
      const reqEnd = Date.now();
      latencies.push(reqEnd - reqStart);
      if (result?.skipped) {
        duplicatesBlocked++;
      } else {
        successful++;
      }
    } catch (err) {
      if (err.code === 11000 || err.message?.includes('duplicate key')) {
        duplicatesBlocked++;
      } else {
        failed++;
      }
    }
  };

  // Run concurrent batches
  const batches = Math.ceil(totalRequests / concurrency);
  for (let b = 0; b < batches; b++) {
    const promises = [];
    const batchSize = Math.min(concurrency, totalRequests - b * concurrency);
    for (let i = 0; i < batchSize; i++) {
      promises.push(processOne(b * concurrency + i));
    }
    await Promise.all(promises);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const throughput = ((successful + duplicatesBlocked) / totalTime).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`BENCHMARK (Target: ${concurrency} concurrent, Total: ${totalRequests} requests)`);
  console.log(`======================================================`);
  console.log(`Completed: ${successful + duplicatesBlocked + failed} | Successful Ingestion: ${successful} | Duplicates Blocked: ${duplicatesBlocked} | Errors: ${failed}`);
  console.log(`Total Time: ${totalTime.toFixed(2)}s | Real Processing Throughput: ${throughput} req/sec`);
  console.log(`End-to-End Latency: p50 = ${p50}ms | p95 = ${p95}ms | p99 = ${p99}ms`);
  console.log(`Node Heap Memory: ${memBefore.toFixed(1)}MB -> ${memAfter.toFixed(1)}MB (Delta: +${(memAfter - memBefore).toFixed(1)}MB)`);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB for End-to-End Load Benchmark');

  // Benchmark at 100, 500, 1000 requests
  await runEndToEndBenchmark(50, 100);
  await runEndToEndBenchmark(100, 500);
  await runEndToEndBenchmark(200, 1000);

  await mongoose.disconnect();
}

main();
