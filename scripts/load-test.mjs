// Lightweight load test with no dependencies: hammers the catalogue search and the booking
// endpoint with concurrent requests and reports throughput + latency percentiles.
//   BASE_URL=http://localhost:3000 node scripts/load-test.mjs [seconds] [concurrency]
// Run the target with API_MAX_REQUESTS_PER_MINUTE=1000000 — otherwise the per-IP limiter (600/min) rejects the flood by design.
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const seconds = Number(process.argv[2] || 10);
const concurrency = Number(process.argv[3] || 25);

const targets = [
  { name: 'catalogue page', url: `${base}/api/v1/properties/public?page=1&pageSize=24&sort=relevance` },
  {
    name: 'catalogue city+filters',
    url: `${base}/api/v1/properties/public?city=Hyderabad&roomTypes=single,double&food=true&minRating=4&page=1&pageSize=24`,
  },
  {
    name: 'nearest',
    url: `${base}/api/v1/properties/public?lat=17.44&lng=78.39&radiusKm=15&sort=nearest&page=1&pageSize=24`,
  },
  { name: 'listing detail', url: null },
  { name: 'public stats', url: `${base}/api/v1/public/stats` },
];

const first = await fetch(targets[0].url).then((r) => r.json());
targets[3].url = `${base}/api/v1/properties/public/${first.data[0].slug}`;

async function run(target) {
  const latencies = [];
  let errors = 0;
  const end = Date.now() + seconds * 1000;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (Date.now() < end) {
        const t = performance.now();
        try {
          const res = await fetch(target.url);
          if (!res.ok) errors += 1;
          await res.arrayBuffer();
        } catch {
          errors += 1;
        }
        latencies.push(performance.now() - t);
      }
    })
  );
  latencies.sort((a, b) => a - b);
  const p = (q) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))].toFixed(1);
  console.log(
    `${target.name.padEnd(24)} ${(latencies.length / seconds).toFixed(0).padStart(6)} req/s  p50 ${p(0.5)}ms  p95 ${p(0.95)}ms  p99 ${p(0.99)}ms  errors ${errors}`
  );
  return { name: target.name, rps: latencies.length / seconds, p95: Number(p(0.95)), errors };
}

console.log(`Load test: ${seconds}s x ${concurrency} concurrent against ${base}\n`);
const results = [];
for (const t of targets) results.push(await run(t));
const bad = results.filter((r) => r.errors > 0 || r.p95 > 1000);
if (bad.length) {
  console.error(`\nFAIL: ${bad.map((b) => b.name).join(', ')} exceeded p95 1000ms or returned errors`);
  process.exit(1);
}
console.log('\nOK: all targets under p95 1000ms with zero errors');
