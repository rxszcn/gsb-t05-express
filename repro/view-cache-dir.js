// 复现：模板缓存只用模板名当 key，换了根目录还在用旧的
const express = require('../');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gsbview'));
const t1 = path.join(root, 't1'), t2 = path.join(root, 't2');
fs.mkdirSync(t1); fs.mkdirSync(t2);
fs.writeFileSync(path.join(t1, 'index.html'), 'FIRST');
fs.writeFileSync(path.join(t2, 'index.html'), 'SECOND');

const app = express();
app.engine('html', (fp, options, cb) => {
  try { cb(null, fs.readFileSync(fp, 'utf8')); } catch (e) { cb(e); }
});
app.set('view engine', 'html');
app.set('view cache', true);
app.set('views', t1);
app.get('/', (req, res) => res.render('index.html'));

const http = require('http');
const srv = app.listen(0, '127.0.0.1', () => {
  const port = srv.address().port;
  let made1 = 0, made2 = 0;
  app.get('/', (req, res) => { made1++; res.render('index.html'); });
  http.get({ port, path: '/' }, r => {
    let a = ''; r.on('data', c => a += c);
    r.on('end', () => {
      app.set('views', t2);
      http.get({ port, path: '/' }, r2 => {
        let b = ''; r2.on('data', c => b += c);
        r2.on('end', () => {
          console.log('第一次 =', JSON.stringify(a.trim()), ' 换目录后 =', JSON.stringify(b.trim()));
          srv.close();
          fs.rmSync(root, { recursive: true, force: true });
          process.exit(0);
        });
      });
    });
  });
});
