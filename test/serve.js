// Serves the app with a fake in-memory Supabase so it can be tested without an account.
//   node test/serve.js        then open:
//   http://localhost:8765/            runs test.js (results at the bottom of the page)
//   http://localhost:8765/?seed       loads sample data to click around in
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  let body;
  try {
    body = fs.readFileSync(path.join(fs.existsSync(path.join(__dirname, file)) ? __dirname : root, path.normalize(file)), 'utf8');
  } catch { res.writeHead(404); return res.end(); }
  if (file === 'app.js') body = body.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/[^']+/, './fake.js').replace('PASTE_PROJECT_URL', 'http://fake');
  if (file === 'index.html') body = body.replace('</body>', `<pre id="out"></pre><script type="module" src="${url.search === '?seed' ? 'seed.js' : 'test.js'}"></script></body>`);
  res.writeHead(200, { 'content-type': types[path.extname(file)] });
  res.end(body);
}).listen(8765, () => console.log('http://localhost:8765/'));
