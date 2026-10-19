// Local preview: node tools/serve.mjs
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.csv':'text/csv; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';const file=path.resolve(root,relative);if(!file.startsWith(root)){res.writeHead(403).end();return}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)}catch{res.writeHead(404).end('Not found')}});
server.on('error',error=>{console.error(error.message);process.exitCode=1});
server.listen(8000,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8000 (Ctrl+C to stop)'));
