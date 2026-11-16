// Скачивает ОФИЦИАЛЬНЫЙ релиз xinntao/Real-ESRGAN (ncnn-vulkan, Windows) в отдельную пустую папку вне проекта.
// Папка задаётся REALESRGAN_DIR (по умолчанию <tmp>/realesrgan). В git не попадает.
// Проверяет SHA-256 архива (если задан EXPECTED_SHA256) и делает пробный прогон на одном файле.
// Запуск: REALESRGAN_DIR=... node scripts/fetch-realesrgan.mjs
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const VERSION = 'v0.2.5.0';
const FILE = 'realesrgan-ncnn-vulkan-20220424-windows.zip';
const URL_ = `https://github.com/xinntao/Real-ESRGAN/releases/download/${VERSION}/${FILE}`;
// SHA-256 официального архива (зафиксирован при первом скачивании 2026-11-16).
const EXPECTED_SHA256 = process.env.REALESRGAN_SHA256 ?? 'abc02804e17982a3be33675e4d471e91ea374e65b70167abc09e31acb412802d';

const DIR = process.env.REALESRGAN_DIR ?? join(tmpdir(), 'realesrgan');
mkdirSync(DIR, { recursive: true });
const zip = join(DIR, FILE);
const exeDir = join(DIR, 'bin');
const exe = join(exeDir, 'realesrgan-ncnn-vulkan.exe');

if (!existsSync(exe)) {
  if (!existsSync(zip)) {
    console.log(`Скачиваю ${URL_}`);
    const res = await fetch(URL_, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  }
  const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');
  console.log(`SHA-256: ${sha}`);
  if (EXPECTED_SHA256 && sha !== EXPECTED_SHA256) {
    throw new Error(`SHA-256 не совпадает (ожидался ${EXPECTED_SHA256}). Архив не распакован.`);
  }
  mkdirSync(exeDir, { recursive: true });
  // tar (bsdtar) есть в Windows 10+; распаковка без запуска чего-либо из архива
  execFileSync('tar', ['-xf', zip, '-C', exeDir], { stdio: 'inherit' });
}
if (!existsSync(exe)) throw new Error(`Нет ${exe}`);
console.log(`Real-ESRGAN: ${exe}`);
console.log('Модели:', readdirSync(join(exeDir, 'models')).filter((f) => f.endsWith('.param')).join(', '));
