// Builds the published site into dist/ (run by the deploy workflow; `npm run build`).
//
// In the repository the page compiles its JSX in the browser (Babel standalone), so it
// runs straight from the files with no build. For the published site that work is done
// here, once:
//   - components/*.js and the page's inline <script type="text/babel"> are compiled with
//     exactly the options the browser used (presets react + env, the same plugins), so
//     they behave the same;
//   - Babel itself (about 3 MB) is no longer loaded, and React's production builds replace
//     the development ones (smaller, faster; their integrity hashes computed from the
//     same versions in node_modules);
//   - every local script's ?v=... becomes this build's id (cache busting).
// Usage: node tools/build.mjs [version]   (version defaults to the git commit id)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Babel = require('@babel/standalone');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const version = (process.argv[2] || (() => { try { return execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch (e) { return String(Date.now()); } })()).slice(0, 8);

// the options Babel standalone uses for a classic <script type="text/babel">
const compile = (code, filename) => Babel.transform(code, {
  filename, presets: ['react', 'env'],
  plugins: ['transform-class-properties', 'transform-object-rest-spread', 'transform-flow-strip-types'],
}).code;
const sri = (file) => 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(path.join(ROOT, 'node_modules', file))).digest('base64');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const dir of ['assets', 'data']) fs.cpSync(path.join(ROOT, dir), path.join(OUT, dir), { recursive: true });

// components: compiled
fs.mkdirSync(path.join(OUT, 'components'));
for (const f of fs.readdirSync(path.join(ROOT, 'components')).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(ROOT, 'components', f), 'utf8');
  fs.writeFileSync(path.join(OUT, 'components', f), compile(src, 'components/' + f));
}

// the page
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const must = (re, what) => { if (!re.test(html)) throw new Error('index.html: ' + what + ' not found'); };
// React: production builds
for (const [pkg, name] of [['react', 'react'], ['react-dom', 'react-dom']]) {
  const re = new RegExp(`<script src="https://unpkg\\.com/${pkg}@([\\d.]+)/umd/${name}\\.development\\.js" integrity="[^"]+"`);
  must(re, pkg);
  html = html.replace(re, (_, v) => {
    const have = require(`${pkg}/package.json`).version;
    if (have !== v) throw new Error(`${pkg}: the page uses ${v}, node_modules has ${have}`);
    return `<script src="https://unpkg.com/${pkg}@${v}/umd/${name}.production.min.js" integrity="${sri(`${pkg}/umd/${name}.production.min.js`)}"`;
  });
}
// no Babel in the page
const babelTag = /<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]+"[^>]*><\/script>\n?/;
must(babelTag, 'the Babel script');
html = html.replace(babelTag, '');
// compiled scripts: plain <script> tags
html = html.replace(/<script type="text\/babel" src=/g, '<script src=');
let inline = 0;
html = html.replace(/<script type="text\/babel">([\s\S]*?)<\/script>/g, (_, code) => {
  inline++;
  return '<script>\n' + compile(code, 'index.html (inline ' + inline + ')').replace(/<\/script/gi, '<\\/script') + '\n</script>';
});
if (/text\/babel/.test(html)) throw new Error('index.html: a text/babel script is left');
// cache busting
html = html.replace(/\?v=[A-Za-z0-9]+"/g, `?v=${version}"`);
fs.writeFileSync(path.join(OUT, 'index.html'), html);

const kb = (f) => Math.round(fs.statSync(f).size / 1024);
console.log(`dist/ built (v=${version}): index.html ${kb(path.join(OUT, 'index.html'))} KB, ` +
  fs.readdirSync(path.join(OUT, 'components')).map(f => `${f} ${kb(path.join(OUT, 'components', f))} KB`).join(', ') + `; ${inline} inline script(s) compiled`);
