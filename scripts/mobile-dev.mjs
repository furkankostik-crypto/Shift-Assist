import { spawn } from 'node:child_process';
import os from 'node:os';
import qrcode from 'qrcode-terminal';

// 1. Yerel Ağ IP Adresini Bul
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let candidate = 'localhost';

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // IPv4, dahili olmayan (127.0.0.1 değil) ve APIPA (169.254.x.x) olmayan adresleri filtrele
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) {
          return net.address;
        }
        candidate = net.address;
      }
    }
  }
  return candidate;
}

const localIp = getLocalIp();
const localPort = 5173;
const localUrl = `http://${localIp}:${localPort}`;

console.log('\x1b[36m%s\x1b[0m', '\n======================================================');
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '   📱 SHIFT ASSIST - MOBIL GELİŞTİRME & ÖNİZLEME');
console.log('\x1b[36m%s\x1b[0m', '======================================================\n');
console.log('🚀 Sunucular ve güvenli dış tünel başlatılıyor, lütfen bekleyin...\n');

// 2. Vite Geliştirme Sunucusunu Başlat
const isWindows = process.platform === 'win32';
const vite = isWindows
  ? spawn('cmd.exe', ['/c', 'npx', 'vite', '--host', '0.0.0.0', '--port', String(localPort)], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
  : spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(localPort)], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

vite.stdout.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('hmr update') || msg.includes('page reload')) {
    console.log('\x1b[32m⚡ [Canlı Güncelleme]\x1b[0m', msg.trim());
  }
});

vite.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('error') || msg.includes('Error')) {
    console.error('\x1b[31m[Vite Hatası]\x1b[0m', msg);
  }
});

// 3. Cloudflare Tünelini Başlat
const cloudflaredCmd = isWindows ? 'cloudflared.exe' : 'cloudflared';
const tunnel = spawn(cloudflaredCmd, ['tunnel', '--url', `http://localhost:${localPort}`], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let tunnelUrlFound = false;

function printDashboard(tunnelUrl) {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '========================================================================');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '   📱 SHIFT ASSIST - TELEFON BAĞLANTI & ÖNİZLEME MERKEZİ');
  console.log('\x1b[36m%s\x1b[0m', '========================================================================\n');

  console.log('\x1b[1m\x1b[33m%s\x1b[0m', '🏠 1. EVDE / AYNI WI-FI AĞINDA (Hızlı Yerel Önizleme):');
  console.log('   Adres: \x1b[4m\x1b[34m' + localUrl + '\x1b[0m');
  console.log('   Telefon kameranızla QR kodu tarayabilirsiniz:\n');
  qrcode.generate(localUrl, { small: true }, (qr) => {
    console.log(qr.split('\n').map(line => '   ' + line).join('\n'));
  });

  console.log('\n\x1b[36m------------------------------------------------------------------------\x1b[0m\n');

  console.log('\x1b[1m\x1b[35m%s\x1b[0m', '🌍 2. DIŞARIDA / MOBİL VERİDE (Dünyanın Her Yerinden Güvenli HTTPS):');
  console.log('   Adres: \x1b[4m\x1b[34m' + tunnelUrl + '\x1b[0m');
  console.log('   (HTTPS olduğu için Service Worker ve "Ana Ekrana Ekle" PWA desteği tam çalışır)');
  console.log('   Telefon kameranızla QR kodu tarayabilirsiniz:\n');
  qrcode.generate(tunnelUrl, { small: true }, (qr) => {
    console.log(qr.split('\n').map(line => '   ' + line).join('\n'));
  });

  console.log('\n\x1b[36m------------------------------------------------------------------------\x1b[0m\n');

  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '💻 3. TELEFONDA KOD YAZMA (VS Code Remote Web):');
  console.log('   Telefondan kod dosyalarını açıp düzenlemek için:');
  console.log('   👉 Ayrı bir terminalde `npm run dev:tunnel` veya `code tunnel` çalıştırın.');
  console.log('   👉 Telefon tarayıcınızdan \x1b[4mhttps://vscode.dev\x1b[0m adresine girerek PC\'nize bağlanın.\n');

  console.log('\x1b[90m%s\x1b[0m', 'Durdurmak için bu pencerede Ctrl + C tuşlarına basın.\n');
}

// Cloudflared URL'i yakala
const handleTunnelOutput = (data) => {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrlFound) {
    tunnelUrlFound = true;
    const tunnelUrl = match[0];
    printDashboard(tunnelUrl);
  }
};

tunnel.stdout.on('data', handleTunnelOutput);
tunnel.stderr.on('data', handleTunnelOutput);

tunnel.on('error', (err) => {
  console.error('\x1b[31m[Cloudflared Hatası]\x1b[0m', err.message);
  console.log('Sadece yerel ağ adresi kullanılabilir:', localUrl);
  qrcode.generate(localUrl, { small: true }, (qr) => {
    console.log(qr);
  });
});

// Temiz kapatma işlemi
function cleanup() {
  console.log('\nKapatılıyor...');
  try {
    if (isWindows && vite && vite.pid) {
      spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F']);
    } else if (vite) {
      vite.kill();
    }
  } catch {}
  try {
    if (isWindows && tunnel && tunnel.pid) {
      spawn('taskkill', ['/pid', String(tunnel.pid), '/T', '/F']);
    } else if (tunnel) {
      tunnel.kill();
    }
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
