import http from 'http';

async function runLoadTest(concurrency, totalRequests) {
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1066070962481909',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '918292463648', phone_number_id: '1252085087993302' },
              contacts: [{ profile: { name: 'Load Tester' }, wa_id: '918292463648' }],
              messages: [
                {
                  from: '918292463648',
                  id: `wamid.loadtest.${Date.now()}.${Math.random().toString(36).substring(7)}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'status_check' },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  });

  const latencies = [];
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();

  const sendRequest = () => {
    return new Promise((resolve) => {
      const reqStart = Date.now();
      const req = http.request(
        {
          hostname: 'localhost',
          port: 5001,
          path: '/api/whatsapp/webhook',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const reqEnd = Date.now();
            latencies.push(reqEnd - reqStart);
            if (res.statusCode === 200) {
              successful++;
            } else {
              failed++;
            }
            resolve();
          });
        }
      );

      req.on('error', (err) => {
        failed++;
        resolve();
      });

      req.write(payload);
      req.end();
    });
  };

  // Run in worker batches
  const batches = Math.ceil(totalRequests / concurrency);
  for (let b = 0; b < batches; b++) {
    const promises = [];
    const batchSize = Math.min(concurrency, totalRequests - b * concurrency);
    for (let i = 0; i < batchSize; i++) {
      promises.push(sendRequest());
    }
    await Promise.all(promises);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const throughput = (successful / totalTime).toFixed(2);

  console.log(`\n--- BENCHMARK RESULTS (Target: ${concurrency} concurrency, Total: ${totalRequests}) ---`);
  console.log(`Total Completed: ${successful + failed} | Successful (200 OK): ${successful} | Failed: ${failed}`);
  console.log(`Total Time: ${totalTime.toFixed(2)}s | Throughput: ${throughput} req/sec`);
  console.log(`Latency: p50 = ${p50}ms | p95 = ${p95}ms | p99 = ${p99}ms`);
}

async function main() {
  console.log('Starting Load Test on Webhook Ingestion Pipeline...');
  await runLoadTest(50, 100);
  await runLoadTest(100, 250);
  await runLoadTest(200, 500);
}

main();
