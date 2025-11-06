const http = require('http');

function check(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ url, status: res.statusCode });
      res.resume();
    });
    req.on('error', (e) => resolve({ url, error: e.message }));
    req.setTimeout(5000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

(async () => {
  const targets = [
    'http://localhost:8080', // webpack dev server
    'http://localhost:4001'  // emulator UI
  ];
  const results = await Promise.all(targets.map(check));
  console.log(JSON.stringify(results, null, 2));
  const ok = results.some(r => r.status && r.status < 500);
  process.exit(ok ? 0 : 1);
})();
