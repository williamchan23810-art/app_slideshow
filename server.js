const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const CONFIG_PATH = path.join(__dirname, 'config.json');

let appConfig = {
  maxMusicTracks: 4,
  allowMp4InPictures: true,
  cachePreviousProductions: false,
  autoPurgeProductionCache: true,
  clearCacheOnStart: true,
  clearCacheOnExportComplete: true,
  clearCacheOnReset: true
};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    appConfig = { ...appConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
  } catch (e) {
    console.warn('Failed to parse config.json, using default configuration:', e);
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
};

// Purge any leftover production or temporary cache files in the project directory
function purgeProductionCache() {
  if (!appConfig.autoPurgeProductionCache && appConfig.cachePreviousProductions) {
    return { purged: [] };
  }

  const purged = [];
  const transientDirs = ['exports', 'temp', 'temp_frames', 'cache', 'output'];

  transientDirs.forEach(dirName => {
    const dirPath = path.join(__dirname, dirName);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        purged.push(dirName);
      } catch (e) {}
    }
  });

  try {
    const files = fs.readdirSync(__dirname);
    files.forEach(file => {
      if (/^travel_slideshow_.*\.(mp4|webm)$/i.test(file) || /^temp_.*\.(mp4|webm|jpg|png)$/i.test(file)) {
        try {
          fs.unlinkSync(path.join(__dirname, file));
          purged.push(file);
        } catch (e) {}
      }
    });
  } catch (e) {}

  return { purged };
}

// Run automatic cleanup on server startup
purgeProductionCache();

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const decodedPathname = decodeURIComponent(parsedUrl.pathname);

  if (decodedPathname === '/api/purge-cache' && (req.method === 'POST' || req.method === 'GET')) {
    const result = purgeProductionCache();
    res.writeHead(200, { 'Content-Type': 'application/json', ...NO_CACHE_HEADERS });
    res.end(JSON.stringify({ ok: true, config: appConfig, ...result }));
    return;
  }

  if (decodedPathname === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...NO_CACHE_HEADERS });
    res.end(JSON.stringify(appConfig));
    return;
  }

  let filePath = path.join(__dirname, decodedPathname === '/' ? 'index.html' : decodedPathname);
  
  // Prevent directory traversal attacks
  const relative = path.relative(__dirname, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403, NO_CACHE_HEADERS);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html', ...NO_CACHE_HEADERS });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500, NO_CACHE_HEADERS);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, ...NO_CACHE_HEADERS });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`App_SlideShow server running at http://localhost:${PORT}/ (cachePreviousProductions: ${appConfig.cachePreviousProductions})`);
});
