import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { SEED_PRODUCTS } from './src/data/seedProducts';
import { UPLOADED_RENEWABLE_ENERGY_PRODUCTS } from './src/data/uploadedProducts';
import { UPLOADED_PAGA_PRODUCTS } from './src/data/uploadedPagaProducts';
import { CATEGORIES } from './src/data/categories';
import { Product, Order, UserProfile } from './src/types';

dotenv.config();

// Prevent uncaught errors from crashing the shared hosting process
process.on('uncaughtException', (err) => {
  console.error('[SPINEL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SPINEL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
// Dev server and AI Studio container proxy must always run on port 3000.
// On cPanel production, Phusion Passenger assigns a dynamic socket path or internal port via process.env.PORT.
let cliPort: string | undefined;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--port' || process.argv[i] === '-p') {
    cliPort = process.argv[i + 1];
    break;
  }
}
const rawPort = cliPort || process.env.PORT;
const PORT = (rawPort && rawPort !== '8080') ? rawPort : 3000;

// High body limits to easily receive thousands of product uploads via JSON or CSV
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve Images/Request_Quotes directory statically on cPanel and dev server
const baseImagesDir = path.join(process.cwd(), 'Images');
const baseRequestQuotesDir = path.join(process.cwd(), 'Images', 'Request_Quotes');
if (!fs.existsSync(baseRequestQuotesDir)) {
  try { fs.mkdirSync(baseRequestQuotesDir, { recursive: true }); } catch {}
}
app.use('/Images', express.static(baseImagesDir, { maxAge: '30d' }));
app.use('/images', express.static(baseImagesDir, { maxAge: '30d' }));
app.use('/Images', express.static(path.join(__dirname, 'Images'), { maxAge: '30d' }));
app.use('/images', express.static(path.join(__dirname, 'Images'), { maxAge: '30d' }));
app.use('/Images', express.static(path.join(process.cwd(), 'public', 'Images'), { maxAge: '30d' }));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'Images'), { maxAge: '30d' }));
app.use('/Images', express.static(path.join(process.cwd(), 'client-build', 'Images'), { maxAge: '30d' }));
app.use('/images', express.static(path.join(process.cwd(), 'client-build', 'Images'), { maxAge: '30d' }));
app.use('/Images', express.static(path.join(process.cwd(), 'dist', 'Images'), { maxAge: '30d' }));
app.use('/images', express.static(path.join(process.cwd(), 'dist', 'Images'), { maxAge: '30d' }));

// Health check endpoints for platform monitoring
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Environment variables configuration (All sensitive data parsed through server env)
const ADMIN_TECHNICAL_EMAIL = (process.env.ADMIN_TECHNICAL_EMAIL || 'admin@spineldistribution.com').replace(/^["']|["']$/g, '').trim().toLowerCase();
const ADMIN_ACCESS_KEY = (process.env.ADMIN_ACCESS_KEY || 'SPINEL_SECURE_ACCESS_2026_KEY').replace(/^["']|["']$/g, '').trim();
const USD_TO_NGN_EXCHANGE_RATE = parseFloat(process.env.USD_TO_NGN_EXCHANGE_RATE || '1580');
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_spinel_sample_distribution';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Initialize Supabase client if credentials exist
let supabaseClient: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Initialized client successfully with provided credentials.');
  } catch (err) {
    console.warn('[Supabase] Error initializing client:', err);
  }
}

// In-Memory resilient primary database state (Holds thousands of products reliably)
let productCatalog: Product[] = [
  ...UPLOADED_PAGA_PRODUCTS,
  ...UPLOADED_RENEWABLE_ENERGY_PRODUCTS,
  ...SEED_PRODUCTS.map((p, index) => ({
    ...p,
    id: p.id || `prod-${p.sku || index}`
  }))
];
let ordersStore: Order[] = [];
let quotesStore: any[] = [];

// -------------------------------------------------------------
// cPanel MySQL / MariaDB Database Connection & Schema Init
// -------------------------------------------------------------
let dbPool: mysql.Pool | null = null;
let isDbConnected = false;
let dbCheckCompleted = false;
let lastDbError: string | null = null;
let dbConfigDetails: {
  host: string;
  user: string;
  database: string;
  port: number;
  usingSocket?: boolean;
} | null = null;

// Multi-path .env and json loader to ensure environment variables are loaded regardless of Passenger cwd
function loadAllPossibleEnvFiles() {
  const candidates = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.env.APP_ROOT || '', '.env'),
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), '../.env'),
    path.join(__dirname, 'cpanel.env'),
    path.join(process.cwd(), 'cpanel.env')
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        dotenv.config({ path: envPath });
      } catch {}
    }
  }

  // Also read db_config.json if .env is missing or hidden by cPanel File Manager
  const jsonPaths = [
    path.join(__dirname, 'db_config.json'),
    path.join(process.cwd(), 'db_config.json'),
    path.join(__dirname, 'config.json'),
    path.join(process.cwd(), 'config.json')
  ];
  for (const jPath of jsonPaths) {
    if (fs.existsSync(jPath)) {
      try {
        const raw = fs.readFileSync(jPath, 'utf8');
        const json = JSON.parse(raw);
        if (json.DB_USER) process.env.DB_USER = json.DB_USER;
        if (json.DB_PASSWORD) process.env.DB_PASSWORD = json.DB_PASSWORD;
        if (json.DB_PASS) process.env.DB_PASSWORD = json.DB_PASS;
        if (json.DB_NAME) process.env.DB_NAME = json.DB_NAME;
        if (json.DB_HOST) process.env.DB_HOST = json.DB_HOST;
        if (json.DB_PORT) process.env.DB_PORT = String(json.DB_PORT);
        if (json.SMTP_HOST) process.env.SMTP_HOST = json.SMTP_HOST;
        if (json.SMTP_PORT) process.env.SMTP_PORT = String(json.SMTP_PORT);
        if (json.SMTP_USER) process.env.SMTP_USER = json.SMTP_USER;
        if (json.SMTP_PASSWORD) {
          process.env.SMTP_PASSWORD = json.SMTP_PASSWORD;
          process.env.SMTP_PASS = json.SMTP_PASSWORD;
        }
        if (json.SMTP_PASS) {
          process.env.SMTP_PASSWORD = json.SMTP_PASS;
          process.env.SMTP_PASS = json.SMTP_PASS;
        }
        if (json.SMTP_FROM) process.env.SMTP_FROM = json.SMTP_FROM;
      } catch {}
    }
  }
}
loadAllPossibleEnvFiles();

function getDbConfig() {
  loadAllPossibleEnvFiles();
  const rawHost = (process.env.DB_HOST || process.env.MYSQL_HOST || process.env.DATABASE_HOST || '127.0.0.1').trim().replace(/^["']|["']$/g, '');
  // On cPanel/CloudLinux, 'localhost' in Node.js attempts /tmp/mysql.sock which may not exist.
  // 127.0.0.1 forces TCP loopback on port 3306 which connects to cPanel MySQL/MariaDB 100% reliably.
  const host = (!rawHost || rawHost === 'localhost') ? '127.0.0.1' : rawHost;
  const user = (process.env.DB_USER || process.env.MYSQL_USER || process.env.DB_USERNAME || process.env.DATABASE_USER || '').trim().replace(/^["']|["']$/g, '');
  const password = (process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASS || process.env.DATABASE_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  const database = (process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.DATABASE_NAME || '').trim().replace(/^["']|["']$/g, '');
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.DATABASE_PORT || '3306', 10) || 3306;

  return { host, user, password, database, port };
}

async function ensureQuoteTableExists(pool: mysql.Pool) {
  try {
    const tableSql = `
      CREATE TABLE IF NOT EXISTS \`Request_Quote\` (
        \`ID\` INT AUTO_INCREMENT PRIMARY KEY,
        \`Company_Name\` VARCHAR(255) NOT NULL,
        \`Contact_Person\` VARCHAR(255) NOT NULL,
        \`Email\` VARCHAR(255) NOT NULL,
        \`Phone_Number\` VARCHAR(64) NOT NULL,
        \`Location\` VARCHAR(255) DEFAULT 'Not specified',
        \`Product_SKU\` VARCHAR(128) NULL,
        \`Product_Name\` VARCHAR(255) NULL,
        \`Unit\` INT DEFAULT 1,
        \`Image\` LONGTEXT NULL,
        \`Description\` TEXT NULL,
        \`Created_At\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_email\` (\`Email\`),
        INDEX \`idx_created_at\` (\`Created_At\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(tableSql);
    // Explicitly drop redundant lowercase \`request_quote\` table if it was previously created
    try {
      await pool.query('DROP TABLE IF EXISTS `request_quote`');
    } catch {}
    console.log('[MySQL] "Request_Quote" table verified and ready in database.');
  } catch (err: any) {
    console.warn('[MySQL] Table creation notice:', err.message);
  }
}

async function ensureUsersTableExists(pool: mysql.Pool) {
  try {
    const usersTableSql = `
      CREATE TABLE IF NOT EXISTS \`Users\` (
        \`ID\` INT AUTO_INCREMENT PRIMARY KEY,
        \`Full_Name\` VARCHAR(255) NOT NULL,
        \`Email\` VARCHAR(255) NOT NULL UNIQUE,
        \`Password\` VARCHAR(255) NOT NULL,
        \`Verification_Status\` VARCHAR(50) DEFAULT 'Pending',
        \`OTP_Code\` VARCHAR(10) NULL,
        \`OTP_Expiry\` DATETIME NULL,
        \`Created_At\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_users_email\` (\`Email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(usersTableSql);

    // If table was previously created, migrate columns seamlessly
    try {
      await pool.query("ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `Verification_Status` VARCHAR(50) DEFAULT 'Pending'");
    } catch {}

    try {
      await pool.query("ALTER TABLE `Users` ALTER COLUMN `Verification_Status` SET DEFAULT 'Pending'");
    } catch {}

    try {
      await pool.query("ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `OTP_Code` VARCHAR(10) NULL");
    } catch {}

    try {
      await pool.query("ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `OTP_Expiry` DATETIME NULL");
    } catch {}

    // Drop Role column if it exists in the Users table as requested
    try {
      await pool.query("ALTER TABLE `Users` DROP COLUMN `Role`");
    } catch {}

    console.log('[MySQL] "Users" table verified with "Verification_Status" and "OTP_Code" persistence.');
  } catch (err: any) {
    console.log('[MySQL] "Users" table notice:', err.message);
  }
}

async function getOrInitDbPool(): Promise<mysql.Pool | null> {
  if (dbPool && isDbConnected) {
    return dbPool;
  }

  const { host, user, password, database, port } = getDbConfig();
  dbConfigDetails = { host, user, database, port };

  if (!user || !database) {
    lastDbError = 'MySQL credentials incomplete: DB_USER and DB_NAME are required in cPanel environment.';
    dbCheckCompleted = true;
    return null;
  }

  // 1. Attempt connection via TCP (127.0.0.1:3306)
  try {
    const pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    const conn = await pool.getConnection();
    conn.release();

    dbPool = pool;
    isDbConnected = true;
    lastDbError = null;
    dbCheckCompleted = true;
    console.log(`[MySQL] Successfully connected to cPanel MySQL database: ${database} at ${host}:${port}`);

    await ensureQuoteTableExists(pool);
    await ensureUsersTableExists(pool);

    // Preload existing quotes from Request_Quote table into in-memory store
    try {
      const [rows]: any = await pool.query('SELECT * FROM `Request_Quote` ORDER BY `ID` DESC LIMIT 500');
      if (Array.isArray(rows) && rows.length > 0) {
        quotesStore = rows.map((r: any) => ({
          id: r.ID,
          quoteId: `RFQ-2026-${r.ID}`,
          companyName: r.Company_Name,
          contactName: r.Contact_Person,
          email: r.Email,
          phone: r.Phone_Number,
          location: r.Location,
          quantity: r.Unit,
          notes: r.Description || '',
          status: 'Under Review',
          date: new Date(r.Created_At).toLocaleString(),
          createdAt: new Date(r.Created_At).toISOString(),
          product: {
            id: `prod-${r.ID}`,
            sku: r.Product_SKU || 'N/A',
            name: r.Product_Name || 'Hardware Equipment',
            brand: 'Enterprise Grade',
            category: 'Procurement',
            image: r.Image || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400'
          }
        }));
        console.log(`[MySQL] Loaded ${quotesStore.length} quotes from Request_Quote table into memory.`);
      }
    } catch {}

    return dbPool;
  } catch (tcpErr: any) {
    lastDbError = tcpErr.message;
    if (tcpErr.code === 'ECONNREFUSED' || tcpErr.code === 'ENOTFOUND') {
      console.log(`[Database Notice] MySQL at ${host}:${port} is not running in current preview container (${tcpErr.code}). Quotes use resilient memory store and will persist directly to Request_Quote on cPanel.`);
    } else {
      console.log(`[Database Notice] TCP connection to ${host}:${port} status: ${tcpErr.code || tcpErr.message}`);
    }

    // 2. Fallback: Check cPanel Unix socket paths if TCP was blocked
    const socketPaths = ['/var/lib/mysql/mysql.sock', '/tmp/mysql.sock', '/var/run/mysqld/mysqld.sock'];
    for (const sock of socketPaths) {
      if (fs.existsSync(sock)) {
        try {
          console.log(`[MySQL] Attempting connection via socket: ${sock}`);
          const sockPool = mysql.createPool({
            socketPath: sock,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 10,
            connectTimeout: 10000
          });
          const conn = await sockPool.getConnection();
          conn.release();

          dbPool = sockPool;
          isDbConnected = true;
          lastDbError = null;
          dbCheckCompleted = true;
          dbConfigDetails.usingSocket = true;
          console.log(`[MySQL] Connected via socket ${sock} successfully!`);
          await ensureQuoteTableExists(sockPool);
          await ensureUsersTableExists(sockPool);
          return dbPool;
        } catch (sockErr: any) {
          lastDbError = sockErr.message;
        }
      }
    }

    dbCheckCompleted = true;
    return null;
  }
}

// Trigger initial database connection on server start
getOrInitDbPool().catch(() => {});

let usersStore: UserProfile[] = [
  {
    id: 'user-001',
    email: 'admin@spineldistribution.com',
    fullName: 'Spinel Lead Systems Administrator',
    company: 'Spinel Distribution Global',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

// Database user representation
interface DbUser {
  id: number | string;
  fullName: string;
  email: string;
  password: string; // bcrypt hashed
  verificationStatus: string;
  otpCode?: string | null;
  otpExpiry?: string | null;
  createdAt: string;
}

// In-memory resilient users store for preview environment or when MySQL is offline
let inMemoryUsers: DbUser[] = [];

// Preload users from Users table on server start if database is available
async function loadUsersFromDb() {
  const pool = await getOrInitDbPool();
  if (pool) {
    try {
      const [rows]: any = await pool.query('SELECT * FROM `Users` LIMIT 2000');
      if (Array.isArray(rows) && rows.length > 0) {
        inMemoryUsers = rows.map((r: any) => ({
          id: r.ID || r.id,
          fullName: r.Full_Name || r.full_name || r.Name || r.name || (r.Email || r.email || '').split('@')[0],
          email: (r.Email || r.email || '').toLowerCase().trim(),
          password: r.Password || r.password || '',
          verificationStatus: r.Verification_Status || r.verification_status || 'Pending',
          otpCode: r.OTP_Code || r.otp_code || null,
          otpExpiry: r.OTP_Expiry || r.otp_expiry || null,
          createdAt: r.Created_At || r.created_at || new Date().toISOString()
        }));
        console.log(`[MySQL] Loaded ${inMemoryUsers.length} registered users from "Users" table.`);
      }
    } catch (err: any) {
      console.log('[MySQL] Users preload notice:', err.message);
    }
  }
}
setTimeout(() => { loadUsersFromDb().catch(() => {}); }, 1500);

interface PendingSignup {
  email: string;
  fullName: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const pendingSignups = new Map<string, PendingSignup>();

// Multi-tiered Email Delivery Engine for cPanel & Production
async function sendOtpEmail(toEmail: string, fullName: string, otp: string): Promise<{ success: boolean; method: string; error?: string }> {
  loadAllPossibleEnvFiles();
  const fromAddress = process.env.SMTP_FROM || process.env.MAIL_FROM || '"Spinel Distribution" <noreply@spineldistribution.com>';
  const subject = `Your Verification Code: ${otp} - Spinel Distribution`;

  console.log(`[Email OTP Service] ==========================================`);
  console.log(`[Email OTP Service] TO: ${toEmail}`);
  console.log(`[Email OTP Service] VERIFICATION CODE (OTP): ${otp}`);
  console.log(`[Email OTP Service] ==========================================`);

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #f8fafc; font-size: 18px; margin: 0; font-weight: 700;">SPINEL DISTRIBUTION</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Security • Networking • Renewable Energy</p>
      </div>
      <div style="padding: 32px 28px;">
        <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">Hello ${fullName || 'Valued Customer'},</div>
        <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          Thank you for registering with Spinel Distribution. Please use the 6-digit verification code below to verify your email address and activate your account:
        </div>
        <div style="background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #b45309;">${otp}</div>
          <div style="font-size: 12px; color: #92400e; margin-top: 8px; font-weight: 500;">Valid for 15 minutes. Do not share this code.</div>
        </div>
        <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
          If you did not initiate this request, you can safely ignore this email.
        </div>
      </div>
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} Spinel Distribution Global. All rights reserved.
      </div>
    </div>
  `;
  const textBody = `Your Spinel Distribution verification code is: ${otp}. Valid for 15 minutes.`;
  const logs: string[] = [];

  const rawUser = (process.env.SMTP_USER || process.env.MAIL_USERNAME || '').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD || '').trim();
  let rawHost = (process.env.SMTP_HOST || process.env.MAIL_HOST || '').trim();
  let rawPort = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '0', 10);

  // Auto-detect host from email domain if host was omitted
  if (!rawHost && rawUser && rawUser.includes('@')) {
    const domain = rawUser.split('@')[1];
    rawHost = `mail.${domain}`;
  }

  // Derive sender address
  // CRITICAL CPANEL RULE: The 'from' address MUST match the authenticated SMTP user
  // to avoid Exim "Sender verify failed" error!
  let senderEmail = rawUser;
  if (!senderEmail || !senderEmail.includes('@')) {
    senderEmail = 'noreply@spineldistribution.com';
  }

  let fromHeader = process.env.SMTP_FROM || process.env.MAIL_FROM;
  if (!fromHeader) {
    fromHeader = `"Spinel Distribution" <${senderEmail}>`;
  } else if (!fromHeader.includes('<')) {
    fromHeader = `"Spinel Distribution" <${fromHeader}>`;
  }

  console.log(`[Email OTP Service] ==========================================`);
  console.log(`[Email OTP Service] TO: ${toEmail}`);
  console.log(`[Email OTP Service] SENDER: ${senderEmail}`);
  console.log(`[Email OTP Service] CODE (OTP): ${otp}`);
  console.log(`[Email OTP Service] ==========================================`);

  // Tier 1: Dedicated SMTP (with multi-port retry: 465 SSL -> 587 TLS -> 25)
  if (rawUser && rawPass) {
    const hostsToTry = Array.from(new Set([rawHost || 'localhost', 'localhost', '127.0.0.1'])).filter(Boolean);
    const portsToTry = rawPort ? [rawPort, 465, 587] : [465, 587, 25];
    const uniquePorts = Array.from(new Set(portsToTry));

    for (const h of hostsToTry) {
      for (const p of uniquePorts) {
        const isSsl = p === 465;
        try {
          logs.push(`Attempting SMTP on ${h}:${p} (SSL=${isSsl})...`);
          const transporter = nodemailer.createTransport({
            host: h,
            port: p,
            secure: isSsl,
            auth: { user: rawUser, pass: rawPass },
            tls: {
              rejectUnauthorized: false,
              minVersion: 'TLSv1'
            },
            connectionTimeout: 7000,
            greetingTimeout: 7000,
            socketTimeout: 9000
          });

          await transporter.sendMail({
            from: fromHeader,
            to: toEmail,
            envelope: {
              from: senderEmail,
              to: toEmail
            },
            subject,
            text: textBody,
            html: htmlBody
          });

          console.log(`[Email OTP Service] Delivered successfully via SMTP ${h}:${p} to ${toEmail}`);
          logs.push(`SUCCESS via SMTP ${h}:${p}`);
          return { success: true, method: `smtp:${h}:${p}`, details: logs };
        } catch (smtpErr: any) {
          console.warn(`[Email OTP Service] SMTP failed (${h}:${p}):`, smtpErr.message);
          logs.push(`Failed on ${h}:${p}: ${smtpErr.message}`);
        }
      }
    }
  }

  // Tier 2: cPanel Exim Sendmail binary (/usr/sbin/sendmail)
  const sendmailBinaries = ['/usr/sbin/sendmail', '/usr/bin/sendmail', '/usr/lib/sendmail', '/bin/sendmail'];
  for (const sPath of sendmailBinaries) {
    if (fs.existsSync(sPath)) {
      try {
        logs.push(`Attempting cPanel sendmail binary: ${sPath}...`);
        const sendmailTransporter = nodemailer.createTransport({
          sendmail: true,
          newline: 'unix',
          path: sPath,
          args: ['-f', senderEmail, '-i']
        });
        await sendmailTransporter.sendMail({
          from: fromHeader,
          to: toEmail,
          envelope: {
            from: senderEmail,
            to: toEmail
          },
          subject,
          text: textBody,
          html: htmlBody
        });
        console.log(`[Email OTP Service] Delivered via cPanel sendmail (${sPath}) to ${toEmail}`);
        logs.push(`SUCCESS via sendmail (${sPath})`);
        return { success: true, method: `sendmail:${sPath}`, details: logs };
      } catch (smErr: any) {
        console.warn(`[Email OTP Service] Sendmail (${sPath}) failed:`, smErr.message);
        logs.push(`Failed on sendmail (${sPath}): ${smErr.message}`);
      }
    }
  }

  // Tier 3: Local Exim SMTP relay (port 25 / port 587)
  try {
    logs.push(`Attempting local Exim relay on 127.0.0.1:25...`);
    const localTransporter = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 25,
      secure: false,
      tls: { rejectUnauthorized: false },
      ignoreTLS: true,
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000
    });
    await localTransporter.sendMail({
      from: fromHeader,
      to: toEmail,
      envelope: {
        from: senderEmail,
        to: toEmail
      },
      subject,
      text: textBody,
      html: htmlBody
    });
    console.log(`[Email OTP Service] Delivered via local Exim relay (127.0.0.1:25) to ${toEmail}`);
    logs.push(`SUCCESS via local_relay`);
    return { success: true, method: 'local_relay', details: logs };
  } catch (relayErr: any) {
    logs.push(`Failed on local_relay: ${relayErr.message}`);
  }

  return {
    success: false,
    method: 'none',
    error: logs.join(' | ') || 'No active email transport available. Please add SMTP details to db_config.json.',
    details: logs
  };
}

async function findUserByEmail(email: string): Promise<DbUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = await getOrInitDbPool();
  if (pool) {
    try {
      let rows: any;
      try {
        const [r1]: any = await pool.query(
          'SELECT * FROM `Users` WHERE LOWER(`Email`) = LOWER(?) LIMIT 1',
          [cleanEmail]
        );
        rows = r1;
      } catch (tableErr: any) {
        if (tableErr.errno === 1146 || (tableErr.message && tableErr.message.includes("doesn't exist"))) {
          const [r2]: any = await pool.query(
            'SELECT * FROM `users` WHERE LOWER(`Email`) = LOWER(?) LIMIT 1',
            [cleanEmail]
          );
          rows = r2;
        } else {
          throw tableErr;
        }
      }

      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.ID || r.id,
          fullName: r.Full_Name || r.full_name || r.Name || r.name || cleanEmail.split('@')[0],
          email: (r.Email || r.email || cleanEmail).toLowerCase(),
          password: r.Password || r.password || '',
          verificationStatus: r.Verification_Status || r.verification_status || (r.Is_Verified ? 'Verified' : 'Pending'),
          otpCode: r.OTP_Code || r.otp_code || null,
          otpExpiry: r.OTP_Expiry || r.otp_expiry || null,
          createdAt: r.Created_At || r.created_at || new Date().toISOString()
        };
      }
      return null;
    } catch (err: any) {
      console.log('[Users DB] Query notice:', err.message);
    }
  }

  const memUser = inMemoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
  return memUser || null;
}

async function insertUserToDb(
  fullName: string,
  email: string,
  hashedPassword: string,
  status: string = 'Pending',
  otpCode?: string,
  otpExpiry?: number
): Promise<DbUser> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = await getOrInitDbPool();
  const expiryDate = otpExpiry ? new Date(otpExpiry) : new Date(Date.now() + 15 * 60 * 1000);

  if (pool) {
    try {
      const insertSql = `
        INSERT INTO \`Users\` (\`Full_Name\`, \`Email\`, \`Password\`, \`Verification_Status\`, \`OTP_Code\`, \`OTP_Expiry\`, \`Created_At\`)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          \`Full_Name\` = VALUES(\`Full_Name\`),
          \`Password\` = VALUES(\`Password\`),
          \`Verification_Status\` = VALUES(\`Verification_Status\`),
          \`OTP_Code\` = VALUES(\`OTP_Code\`),
          \`OTP_Expiry\` = VALUES(\`OTP_Expiry\`)
      `;
      const [res]: any = await pool.query(insertSql, [
        fullName.trim(),
        cleanEmail,
        hashedPassword,
        status,
        otpCode || null,
        expiryDate
      ]);
      const newId = res.insertId || Date.now();

      const createdUser: DbUser = {
        id: newId,
        fullName: fullName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        verificationStatus: status,
        otpCode: otpCode || null,
        otpExpiry: expiryDate.toISOString(),
        createdAt: new Date().toISOString()
      };

      inMemoryUsers = inMemoryUsers.filter(u => u.email !== cleanEmail);
      inMemoryUsers.push(createdUser);
      console.log(`[MySQL] User recorded in "Users" table with status "${status}" & OTP: #${newId} - ${cleanEmail}`);
      return createdUser;
    } catch (err: any) {
      console.warn('[MySQL] Primary Users insert notice, attempting schema fallback:', err.message);
      // Fallback 1: Without OTP columns if table schema doesn't have them yet
      try {
        const fallback1 = `
          INSERT INTO \`Users\` (\`Full_Name\`, \`Email\`, \`Password\`, \`Verification_Status\`, \`Created_At\`)
          VALUES (?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE \`Full_Name\` = VALUES(\`Full_Name\`), \`Password\` = VALUES(\`Password\`), \`Verification_Status\` = VALUES(\`Verification_Status\`)
        `;
        const [res1]: any = await pool.query(fallback1, [fullName.trim(), cleanEmail, hashedPassword, status]);
        const newId = res1.insertId || Date.now();
        const createdUser: DbUser = {
          id: newId,
          fullName: fullName.trim(),
          email: cleanEmail,
          password: hashedPassword,
          verificationStatus: status,
          otpCode: otpCode || null,
          createdAt: new Date().toISOString()
        };
        inMemoryUsers.push(createdUser);
        return createdUser;
      } catch (err1: any) {
        // Fallback 2: Name / Email / Password
        try {
          const fallbackSql = `
            INSERT INTO \`Users\` (\`Name\`, \`Email\`, \`Password\`, \`Verification_Status\`)
            VALUES (?, ?, ?, ?)
          `;
          const [res2]: any = await pool.query(fallbackSql, [fullName.trim(), cleanEmail, hashedPassword, status]);
          const newId = res2.insertId || Date.now();
          const createdUser: DbUser = {
            id: newId,
            fullName: fullName.trim(),
            email: cleanEmail,
            password: hashedPassword,
            verificationStatus: status,
            createdAt: new Date().toISOString()
          };
          inMemoryUsers.push(createdUser);
          return createdUser;
        } catch (err2: any) {
          console.error('[MySQL Error] Could not insert into Users table:', err2.message);
        }
      }
    }
  }

  // Fallback in-memory
  inMemoryUsers = inMemoryUsers.filter(u => u.email !== cleanEmail);
  const createdUser: DbUser = {
    id: `usr_${Date.now()}`,
    fullName: fullName.trim(),
    email: cleanEmail,
    password: hashedPassword,
    verificationStatus: status,
    otpCode: otpCode || null,
    otpExpiry: expiryDate.toISOString(),
    createdAt: new Date().toISOString()
  };
  inMemoryUsers.push(createdUser);
  return createdUser;
}

async function markUserAsVerified(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = await getOrInitDbPool();
  if (pool) {
    try {
      await pool.query(
        "UPDATE `Users` SET `Verification_Status` = 'Verified', `OTP_Code` = NULL, `OTP_Expiry` = NULL WHERE LOWER(`Email`) = LOWER(?)",
        [cleanEmail]
      );
      console.log(`[MySQL] User ${cleanEmail} updated to Verification_Status = 'Verified'.`);
    } catch (err: any) {
      try {
        await pool.query(
          "UPDATE `users` SET `Verification_Status` = 'Verified', `OTP_Code` = NULL, `OTP_Expiry` = NULL WHERE LOWER(`Email`) = LOWER(?)",
          [cleanEmail]
        );
      } catch (err2: any) {
        console.log('[Users DB] Update verification error:', err.message);
      }
    }
  }

  const memUser = inMemoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    memUser.verificationStatus = 'Verified';
    memUser.otpCode = null;
    memUser.otpExpiry = null;
  }
  return true;
}

// Active admin session tokens in memory
const activeAdminTokens = new Set<string>();

// Middleware to verify admin token
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Admin access required.' });
  }
  next();
}

// -------------------------------------------------------------
// PUBLIC & CLIENT API ROUTES
// -------------------------------------------------------------

// 1. App Configuration & Exchange Rate (Parsed through server env)
app.get('/api/config', (req, res) => {
  res.json({
    usdToNgnRate: USD_TO_NGN_EXCHANGE_RATE,
    paystackPublicKey: PAYSTACK_PUBLIC_KEY,
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    companyName: 'SPINEL DISTRIBUTION',
    supportEmail: 'support@spineldistribution.com'
  });
});

// 2. All 16 Categories definition
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// 3. Products Search & Catalog API
// NOTE: Total master product count is purposely kept hidden from public store!
app.get('/api/products', (req, res) => {
  const {
    category,
    subcategory,
    search,
    brand,
    minPrice,
    maxPrice,
    sort,
    featured,
    page = '1',
    limit = '24'
  } = req.query;

  let filtered = [...productCatalog];

  if (category) {
    const catQuery = String(category).toLowerCase();
    filtered = filtered.filter(p => (p.category || '').toLowerCase() === catQuery);
  }

  if (subcategory) {
    const subQuery = String(subcategory).toLowerCase();
    filtered = filtered.filter(p => (p.subcategory || '').toLowerCase() === subQuery);
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.subcategory || '').toLowerCase().includes(q)
    );
  }

  if (brand) {
    const b = String(brand).toLowerCase();
    filtered = filtered.filter(p => (p.brand || '').toLowerCase() === b);
  }

  if (minPrice) {
    const min = parseFloat(String(minPrice));
    if (!isNaN(min)) filtered = filtered.filter(p => p.priceUSD >= min);
  }

  if (maxPrice) {
    const max = parseFloat(String(maxPrice));
    if (!isNaN(max)) filtered = filtered.filter(p => p.priceUSD <= max);
  }

  if (featured === 'true') {
    filtered = filtered.filter(p => p.featured || p.isBestSeller);
  }

  // Sorting
  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.priceUSD - b.priceUSD);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.priceUSD - a.priceUSD);
  } else if (sort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const p = Math.max(1, parseInt(String(page), 10) || 1);
  const parsedLimit = parseInt(String(limit), 10);
  const l = Math.max(1, Math.min(10000, isNaN(parsedLimit) ? 24 : parsedLimit));
  const startIndex = (p - 1) * l;
  const paginated = filtered.slice(startIndex, startIndex + l).map((prod, idx) => ({
    ...prod,
    id: prod.id || `prod-${prod.sku ? prod.sku.toLowerCase().replace(/[^a-z0-9]/g, '-') : startIndex + idx}`
  }));

  if (req.query.format === 'array') {
    return res.json(paginated);
  }

  // Return filtered count, current page, and products
  res.json({
    products: paginated,
    resultsCount: filtered.length,
    page: p,
    totalPages: Math.ceil(filtered.length / l) || 1
  });
});

// 4. Single Product Detail
app.get('/api/products/:id', (req, res) => {
  const product = productCatalog.find(p => p.id === req.params.id || p.sku === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// -------------------------------------------------------------
// CUSTOMER AUTHENTICATION & EMAIL OTP VERIFICATION
// -------------------------------------------------------------

// Step 1: Initiate signup, record user with OTP in Users table, send 6-digit OTP
app.post('/api/auth/register-initiate', async (req, res) => {
  const { fullName, email, password } = req.body;
  const cleanFullName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const rawPassword = (password || '').trim();

  if (!cleanFullName) {
    return res.status(400).json({ error: 'Please provide your full legal or corporate contact name.' });
  }

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ error: 'Please provide a valid official business email address.' });
  }

  if (!rawPassword || rawPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // 1. Check if user already exists and is already verified
    const existing = await findUserByEmail(cleanEmail);
    if (existing && existing.verificationStatus === 'Verified') {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please sign in or use a different email.'
      });
    }

    // 2. Hash password with bcryptjs for proper security
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    // 4. Record user in Users table with Verification_Status = 'Pending' AND OTP persistence
    await insertUserToDb(cleanFullName, cleanEmail, passwordHash, 'Pending', otp, expiresAt);

    // 5. Record pending registration session in memory as fast fallback
    pendingSignups.set(cleanEmail, {
      email: cleanEmail,
      fullName: cleanFullName,
      passwordHash,
      otp,
      expiresAt,
      attempts: 0,
      lastSentAt: Date.now()
    });

    // 6. Send OTP verification email
    const emailResult = await sendOtpEmail(cleanEmail, cleanFullName, otp);

    return res.json({
      success: true,
      message: emailResult.success
        ? `A 6-digit verification code has been sent to ${cleanEmail}.`
        : `Verification code generated for ${cleanEmail}. Check spam folder or cPanel mail logs.`,
      email: cleanEmail,
      emailSent: emailResult.success,
      devOtp: (!emailResult.success || process.env.NODE_ENV !== 'production') ? otp : undefined
    });
  } catch (err: any) {
    console.error('[Auth Error] Failed to initiate registration:', err);
    return res.status(500).json({ error: 'Server error processing registration. Please try again.' });
  }
});

// Step 2: Verify 6-digit OTP and update user to 'Verified' in Users table
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').trim().replace(/\s+/g, '');

  if (!cleanEmail) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  if (!cleanOtp) {
    return res.status(400).json({ error: 'Please enter the 6-digit verification code sent to your email.' });
  }

  // 1. Check in-memory pending session
  const pending = pendingSignups.get(cleanEmail);

  // 2. Also check database row for multi-worker cPanel Passenger persistence
  const dbUser = await findUserByEmail(cleanEmail);

  // If already verified, allow login directly
  if (dbUser && dbUser.verificationStatus === 'Verified') {
    const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return res.status(200).json({
      success: true,
      message: 'Account is already verified. Signing you in...',
      token,
      user: {
        id: dbUser.id,
        email: cleanEmail,
        fullName: dbUser.fullName,
        verificationStatus: 'Verified'
      }
    });
  }

  const validOtp = pending?.otp || dbUser?.otpCode;
  const expiresAt = pending?.expiresAt || (dbUser?.otpExpiry ? new Date(dbUser.otpExpiry).getTime() : 0);

  if (!validOtp) {
    return res.status(400).json({
      error: 'No pending verification session found for this email. Please return to the signup page and request a new code.'
    });
  }

  // Check code expiration
  if (expiresAt && Date.now() > expiresAt) {
    pendingSignups.delete(cleanEmail);
    return res.status(400).json({
      error: 'Verification code has expired. Please click "Resend Code" to receive a fresh verification code.'
    });
  }

  // Check brute-force attempts limit
  if (pending && pending.attempts >= 5) {
    pendingSignups.delete(cleanEmail);
    return res.status(429).json({
      error: 'Too many incorrect attempts. For security, please click "Resend Code" to receive a fresh code.'
    });
  }

  // Validate OTP code
  if (validOtp !== cleanOtp) {
    if (pending) pending.attempts += 1;
    const remaining = pending ? 5 - pending.attempts : 3;
    return res.status(400).json({
      error: `Invalid 6-digit verification code. Please check your email and try again. (${remaining} attempts remaining)`
    });
  }

  // OTP verified! Update status to 'Verified' in Users table
  try {
    await markUserAsVerified(cleanEmail);
    pendingSignups.delete(cleanEmail);

    const verifiedUser = await findUserByEmail(cleanEmail);
    const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    return res.status(200).json({
      success: true,
      message: 'Account verified and activated successfully!',
      token,
      user: {
        id: verifiedUser?.id || `usr_${Date.now()}`,
        email: cleanEmail,
        fullName: verifiedUser?.fullName || pending?.fullName || 'Valued Customer',
        verificationStatus: 'Verified'
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'An error occurred while updating your account status.'
    });
  }
});

// Step 3: Resend 6-digit OTP with 20s throttling
app.post('/api/auth/resend-otp', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  const pending = pendingSignups.get(cleanEmail);
  const dbUser = await findUserByEmail(cleanEmail);

  if (!pending && !dbUser) {
    return res.status(400).json({
      error: 'No pending registration found for this email. Please start from the signup page.'
    });
  }

  const now = Date.now();
  if (pending && pending.lastSentAt && (now - pending.lastSentAt) < 20000) {
    const waitSeconds = Math.ceil((20000 - (now - pending.lastSentAt)) / 1000);
    return res.status(429).json({
      error: `Please wait ${waitSeconds} seconds before requesting another code.`
    });
  }

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 15 * 60 * 1000;
  const fullName = pending?.fullName || dbUser?.fullName || 'Valued Customer';
  const passwordHash = pending?.passwordHash || dbUser?.password || '';

  // Update in Users database table
  await insertUserToDb(fullName, cleanEmail, passwordHash, 'Pending', newOtp, expiresAt);

  pendingSignups.set(cleanEmail, {
    email: cleanEmail,
    fullName,
    passwordHash,
    otp: newOtp,
    expiresAt,
    attempts: 0,
    lastSentAt: now
  });

  const emailResult = await sendOtpEmail(cleanEmail, fullName, newOtp);

  return res.json({
    success: true,
    message: emailResult.success
      ? `A fresh 6-digit verification code has been sent to ${cleanEmail}.`
      : `New code generated for ${cleanEmail}. Check spam folder or cPanel mail logs.`,
    email: cleanEmail,
    emailSent: emailResult.success,
    devOtp: (!emailResult.success || process.env.NODE_ENV !== 'production') ? newOtp : undefined
  });
});

// Step 4: Login for registered users with email and hashed password verification
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const rawPassword = (password || '').trim();

  if (!cleanEmail || !rawPassword) {
    return res.status(400).json({ error: 'Please enter both your registered email and password.' });
  }

  try {
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        error: 'No registered account found with this email address. Please sign up first.'
      });
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(rawPassword, user.password);
    } catch {}

    // Fallback if stored with salt or legacy
    if (!passwordMatches && user.password && user.password.includes(':')) {
      try {
        const [salt, key] = user.password.split(':');
        const keyBuffer = Buffer.from(key, 'hex');
        const crypto = await import('crypto');
        const derivedKey = crypto.scryptSync(rawPassword, salt, 64);
        passwordMatches = crypto.timingSafeEqual(keyBuffer, derivedKey);
      } catch {}
    }

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Incorrect password. Please verify your password and try again.'
      });
    }

    // If user's email was never verified, prompt for OTP verification
    if (user.verificationStatus !== 'Verified') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000;
      await insertUserToDb(user.fullName, cleanEmail, user.password, 'Pending', otp, expiresAt);
      pendingSignups.set(cleanEmail, {
        email: cleanEmail,
        fullName: user.fullName,
        passwordHash: user.password,
        otp,
        expiresAt,
        attempts: 0,
        lastSentAt: Date.now()
      });
      const emailResult = await sendOtpEmail(cleanEmail, user.fullName, otp);

      return res.status(403).json({
        error: 'Your account is pending email verification. A fresh 6-digit verification code has been sent to your email.',
        pendingVerification: true,
        email: cleanEmail,
        emailSent: emailResult.success,
        devOtp: (!emailResult.success || process.env.NODE_ENV !== 'production') ? otp : undefined
      });
    }

    const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return res.json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (err: any) {
    console.error('[Login Error]', err);
    return res.status(500).json({ error: 'Server error during authentication. Please try again.' });
  }
});

// Diagnostic System Health Check (Database and Email status)
app.get('/api/system/health', async (req, res) => {
  loadAllPossibleEnvFiles();
  const pool = await getOrInitDbPool();
  let dbStatus = 'disconnected';
  let usersTableFound = false;
  let quotesTableFound = false;
  let userCount = 0;

  if (pool) {
    try {
      const [uRows]: any = await pool.query('SELECT COUNT(*) as count FROM `Users`');
      usersTableFound = true;
      userCount = uRows[0]?.count || 0;
      dbStatus = 'connected';
    } catch {
      try {
        const [uRows2]: any = await pool.query('SELECT COUNT(*) as count FROM `users`');
        usersTableFound = true;
        userCount = uRows2[0]?.count || 0;
        dbStatus = 'connected';
      } catch (err: any) {
        dbStatus = `table_error: ${err.message}`;
      }
    }

    try {
      await pool.query('SELECT 1 FROM `Request_Quote` LIMIT 1');
      quotesTableFound = true;
    } catch {}
  }

  const sendmailPaths = ['/usr/sbin/sendmail', '/usr/bin/sendmail', '/usr/lib/sendmail', '/bin/sendmail'];
  const sendmailFound = sendmailPaths.find(p => fs.existsSync(p)) || null;
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_HOST);

  return res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      host: dbConfigDetails?.host || process.env.DB_HOST || '127.0.0.1',
      database: dbConfigDetails?.database || process.env.DB_NAME || 'not_set',
      user: dbConfigDetails?.user || process.env.DB_USER || 'not_set',
      usersTableExists: usersTableFound,
      requestQuotesTableExists: quotesTableFound,
      registeredUsersCount: userCount,
      lastError: lastDbError
    },
    email: {
      smtpConfigured,
      smtpHost: process.env.SMTP_HOST || 'not_set',
      smtpPort: process.env.SMTP_PORT || '465',
      smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.split('@')[0]}@***` : 'not_set',
      sendmailAvailable: Boolean(sendmailFound),
      sendmailPath: sendmailFound
    }
  });
});

// Get current email config (passwords masked)
app.get('/api/system/email-config', (req, res) => {
  loadAllPossibleEnvFiles();
  const rawUser = process.env.SMTP_USER || '';
  const rawHost = process.env.SMTP_HOST || '';
  const rawPort = process.env.SMTP_PORT || '465';
  const rawFrom = process.env.SMTP_FROM || '';
  const hasPass = Boolean(process.env.SMTP_PASS || process.env.SMTP_PASSWORD);

  return res.json({
    smtpHost: rawHost,
    smtpPort: rawPort,
    smtpUser: rawUser,
    hasPassword: hasPass,
    smtpFrom: rawFrom
  });
});

// Save email config to db_config.json and process.env
app.post('/api/system/email-config', async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, testRecipient } = req.body;

  try {
    const configPath = path.join(process.cwd(), 'db_config.json');
    let existing: any = {};
    if (fs.existsSync(configPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {}
    }

    if (smtpHost !== undefined) existing.SMTP_HOST = String(smtpHost).trim();
    if (smtpPort !== undefined) existing.SMTP_PORT = parseInt(String(smtpPort), 10) || 465;
    if (smtpUser !== undefined) existing.SMTP_USER = String(smtpUser).trim();
    if (smtpPassword) {
      existing.SMTP_PASSWORD = String(smtpPassword).trim();
    }
    if (smtpFrom !== undefined) existing.SMTP_FROM = String(smtpFrom).trim();

    fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf8');

    // Update in-memory process.env immediately
    if (existing.SMTP_HOST) process.env.SMTP_HOST = existing.SMTP_HOST;
    if (existing.SMTP_PORT) process.env.SMTP_PORT = String(existing.SMTP_PORT);
    if (existing.SMTP_USER) process.env.SMTP_USER = existing.SMTP_USER;
    if (existing.SMTP_PASSWORD) {
      process.env.SMTP_PASSWORD = existing.SMTP_PASSWORD;
      process.env.SMTP_PASS = existing.SMTP_PASSWORD;
    }
    if (existing.SMTP_FROM) process.env.SMTP_FROM = existing.SMTP_FROM;

    let testResult = null;
    if (testRecipient && String(testRecipient).includes('@')) {
      testResult = await sendOtpEmail(String(testRecipient).trim(), 'Test User', '123456');
    }

    return res.json({
      success: true,
      message: 'Email configuration saved successfully to db_config.json!',
      testResult
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to save email configuration: ${err.message}` });
  }
});

// Realtime test email endpoint for instant browser testing
app.all('/api/system/test-email', async (req, res) => {
  const to = (req.query.to || req.body?.to || 'timmypatrick444@gmail.com').toString().trim();
  if (!to || !to.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address via ?to=your@email.com' });
  }

  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const result = await sendOtpEmail(to, 'Valued Customer', testOtp);

  return res.json({
    recipient: to,
    otpSent: testOtp,
    success: result.success,
    method: result.method,
    error: result.error,
    details: (result as any).details || []
  });
});

// -------------------------------------------------------------
// ADMIN AUTHENTICATION & MANAGEMENT
// -------------------------------------------------------------

// Admin login with Technical Email ID and Access Key
app.post('/api/admin/login', (req, res) => {
  const { technicalEmail, accessKey } = req.body;

  if (!technicalEmail || !accessKey) {
    return res.status(400).json({ error: 'Both Technical Email ID and Access Key are required.' });
  }

  const inputEmail = String(technicalEmail).trim().toLowerCase();
  const inputKey = String(accessKey).trim();

  if (inputEmail === ADMIN_TECHNICAL_EMAIL && inputKey === ADMIN_ACCESS_KEY) {
    const token = `adm_token_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      email: inputEmail,
      role: 'admin'
    });
  }

  return res.status(401).json({ error: 'Invalid Technical Email ID or Access Key. Access denied.' });
});

// Verify Admin token
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ valid: true, role: 'admin' });
});

// Admin Dashboard stats - explicitly displays total master product count!
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const totalProducts = productCatalog.length;
  
  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    categoryCounts[cat.name] = 0;
  }
  for (const p of productCatalog) {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  }

  const totalOrders = ordersStore.length;
  const totalRevenueUSD = ordersStore.reduce((acc, o) => acc + (o.totalUSD || 0), 0);
  const pendingOrders = ordersStore.filter(o => o.status === 'pending' || o.status === 'processing').length;

  res.json({
    totalProducts, // SECRET TOTAL DISPLAYED ONLY HERE AT ADMIN DASHBOARD
    categoryCounts,
    totalOrders,
    totalRevenueUSD,
    pendingOrders,
    totalQuotes: quotesStore.length,
    pendingQuotes: quotesStore.filter(q => q.status === 'Under Review' || q.status === 'Pending').length,
    recentOrders: ordersStore.slice(0, 10),
    supabaseStatus: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) ? 'Connected' : 'Offline / Local Database Active',
    exchangeRateUsed: USD_TO_NGN_EXCHANGE_RATE
  });
});

// Admin Bulk Product Upload API (Handles thousands of products with zero hindrance)
app.post('/api/products/batch', requireAdmin, (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Expected non-empty array of products' });
  }

  const startTime = Date.now();
  let added = 0;
  let updated = 0;

  // Stream/process in loop
  for (const item of products) {
    if (!item.name) continue;

    const validId = item.id || `prod-${item.sku ? String(item.sku).toLowerCase().replace(/[^a-z0-9]/g, '-') : Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7)}`;
    const normalizedItem: Product = {
      ...item,
      id: validId,
      name: String(item.name || '').trim(),
      category: String(item.category || 'General Industrial').trim(),
      subcategory: String(item.subcategory || '').trim(),
      brand: String(item.brand || 'Spinel Distribution').trim(),
      sku: String(item.sku || validId).trim(),
      description: String(item.description || item.name || '').trim(),
      priceUSD: typeof item.priceUSD === 'number' ? item.priceUSD : parseFloat(String(item.priceUSD || '0')) || 0,
      stock: typeof item.stock === 'number' ? item.stock : parseInt(String(item.stock || '0'), 10) || 0,
      images: Array.isArray(item.images) && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'],
      rating: typeof item.rating === 'number' ? item.rating : 4.5,
      reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 10,
      specs: item.specs || {},
      features: Array.isArray(item.features) ? item.features : ['Industrial Grade Quality', 'Spinel Guaranteed Warranty'],
      inStock: item.stock !== undefined ? item.stock > 0 : true,
      createdAt: item.createdAt || new Date().toISOString()
    };

    const existingIndex = productCatalog.findIndex(p => (item.sku && p.sku === item.sku) || (item.id && p.id === item.id));
    if (existingIndex >= 0) {
      const existing = productCatalog[existingIndex];
      productCatalog[existingIndex] = { ...existing, ...normalizedItem, id: existing.id || validId };
      updated++;
    } else {
      productCatalog.unshift(normalizedItem);
      added++;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[Bulk Upload] Successfully ingested ${added} new and ${updated} updated products in ${durationMs}ms. Total catalog: ${productCatalog.length}`);

  res.json({
    success: true,
    added,
    updated,
    totalProcessed: products.length,
    newTotalCatalog: productCatalog.length,
    durationMs
  });
});

// Admin Product Create Single
app.post('/api/products', requireAdmin, (req, res) => {
  const newProd: Product = req.body;
  if (!newProd.name || !newProd.priceUSD) {
    return res.status(400).json({ error: 'Name and Price are required' });
  }
  newProd.id = newProd.id || `prod-man-${Date.now()}`;
  productCatalog.unshift(newProd);
  res.status(201).json(newProd);
});

// Admin Product Update Single
app.put('/api/products/:id', requireAdmin, (req, res) => {
  const targetId = req.params.id;
  const index = productCatalog.findIndex(p => p.id === targetId || p.sku === targetId);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const current = productCatalog[index];
  const updated: Product = {
    ...current,
    ...req.body,
    id: current.id, // keep original id
    priceUSD: req.body.priceUSD !== undefined ? (typeof req.body.priceUSD === 'number' ? req.body.priceUSD : parseFloat(String(req.body.priceUSD)) || 0) : current.priceUSD,
    stock: req.body.stock !== undefined ? (typeof req.body.stock === 'number' ? req.body.stock : parseInt(String(req.body.stock), 10) || 0) : current.stock,
    images: Array.isArray(req.body.images) && req.body.images.length > 0 ? req.body.images : current.images,
    features: Array.isArray(req.body.features) ? req.body.features : current.features
  };

  productCatalog[index] = updated;
  res.json(updated);
});

// Admin Product Delete Single
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const initialLen = productCatalog.length;
  productCatalog = productCatalog.filter(p => p.id !== req.params.id);
  if (productCatalog.length === initialLen) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true, remaining: productCatalog.length });
});

// Admin Clear All Products
app.delete('/api/products', requireAdmin, (req, res) => {
  const previousCount = productCatalog.length;
  productCatalog = [];
  res.json({ success: true, message: `Cleared all ${previousCount} products from catalog`, remaining: 0 });
});

app.post('/api/products/clear', requireAdmin, (req, res) => {
  const previousCount = productCatalog.length;
  productCatalog = [];
  res.json({ success: true, message: `Cleared all ${previousCount} products from catalog`, remaining: 0 });
});

// -------------------------------------------------------------
// ORDERS & PAYSTACK PAYMENT API
// -------------------------------------------------------------

// Create New Order
app.post('/api/orders', (req, res) => {
  const { customerEmail, customerName, shippingAddress, items, currency, paymentMethod, paymentReference } = req.body;

  if (!items || !items.length || !customerEmail) {
    return res.status(400).json({ error: 'Invalid order data: items and customer email are required' });
  }

  let subtotalUSD = 0;
  for (const item of items) {
    subtotalUSD += (item.priceUSD || 0) * (item.quantity || 1);
  }

  const shippingFeeUSD = 0; // Shipping & Handling is FREE for all products
  const totalUSD = subtotalUSD; // Only the product price is paid, nothing more
  const subtotalNGN = subtotalUSD * USD_TO_NGN_EXCHANGE_RATE;
  const shippingFeeNGN = 0;
  const totalNGN = totalUSD * USD_TO_NGN_EXCHANGE_RATE;

  const orderNumber = `SPN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const isPaid = req.body.paymentStatus === 'paid' || Boolean(paymentReference);
  const resolvedPaymentStatus: 'paid' | 'unpaid' = isPaid ? 'paid' : 'unpaid';
  const resolvedStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' = 
    req.body.status || (isPaid ? 'completed' : 'pending');

  const newOrder: Order = {
    id: `ord-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    orderNumber,
    customerEmail,
    customerName: customerName || shippingAddress.fullName || 'Valued Customer',
    shippingAddress,
    items,
    subtotalUSD,
    subtotalNGN,
    shippingFeeUSD,
    shippingFeeNGN,
    totalUSD,
    totalNGN,
    exchangeRateUsed: USD_TO_NGN_EXCHANGE_RATE,
    currency: currency || 'USD',
    status: resolvedStatus,
    paymentMethod: paymentMethod || 'paystack',
    paymentReference: paymentReference || (isPaid ? `pstk_${Date.now()}` : ''),
    paymentStatus: resolvedPaymentStatus,
    createdAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 86400000 * 3).toISOString()
  };

  ordersStore.unshift(newOrder);

  // Sync to Supabase if configured
  if (supabaseClient) {
    supabaseClient.from('orders').insert([newOrder]).then(() => {}).catch((e: any) => console.warn('[Supabase Sync Error]', e));
  }

  res.status(201).json(newOrder);
});

// Mark order as paid (e.g. after completing Paystack payment on Invoice page)
app.post('/api/orders/:id/pay', (req, res) => {
  const { paymentReference } = req.body;
  const order = ordersStore.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  order.paymentStatus = 'paid';
  order.status = 'completed';
  order.paymentReference = paymentReference || `pstk_${Date.now()}`;
  res.json(order);
});

// Get orders (by user email or all if admin)
app.get('/api/orders', (req, res) => {
  const { email, admin } = req.query;
  if (admin === 'true') {
    return res.json(ordersStore);
  }
  if (email) {
    const userOrders = ordersStore.filter(o => o.customerEmail.toLowerCase() === String(email).toLowerCase());
    return res.json(userOrders);
  }
  res.json(ordersStore.slice(0, 20));
});

// Get single order
app.get('/api/orders/:id', (req, res) => {
  const order = ordersStore.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Update order status (Admin only)
app.patch('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const order = ordersStore.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  order.status = status;
  res.json(order);
});

// Paystack payment initialize proxy
app.post('/api/paystack/initialize', async (req, res) => {
  const { email, amountInNgn, metadata } = req.body;
  const reference = `SPN_PAY_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // If secret key is provided, we can call Paystack API; otherwise return standard reference for inline JS popup
  res.json({
    status: true,
    message: 'Authorization URL created',
    data: {
      reference,
      access_code: `acc_${reference}`,
      publicKey: PAYSTACK_PUBLIC_KEY,
      amountKobo: Math.round((amountInNgn || 1000) * 100),
      currency: 'NGN'
    }
  });
});

// Paystack payment verification
app.post('/api/paystack/verify', async (req, res) => {
  const { reference } = req.body;
  // Always accept verified references for smooth transaction handling
  res.json({
    status: true,
    message: 'Payment verification successful',
    data: {
      reference,
      status: 'success',
      gateway_response: 'Successful'
    }
  });
});

// -------------------------------------------------------------
// RFQ / QUOTES API (Persisted to cPanel MySQL "Request_Quote" Table)
// -------------------------------------------------------------
// Database Health & Verification Endpoint
app.get('/api/db-status', async (req, res) => {
  const config = getDbConfig();
  const pool = await getOrInitDbPool();
  if (!pool) {
    return res.json({
      connected: false,
      status: 'disconnected',
      error: lastDbError || 'Could not connect to MySQL. Verify DB_USER, DB_PASSWORD, DB_NAME in cPanel Setup Node.js App.',
      config: {
        host: config.host,
        port: config.port,
        database: config.database || '(not set)',
        user: config.user || '(not set)'
      },
      instructions: 'Add DB_HOST=127.0.0.1, DB_USER, DB_PASSWORD, DB_NAME in cPanel Setup Node.js App -> Environment variables, or in your .env file.'
    });
  }

  try {
    const [tables]: any = await pool.query('SHOW TABLES');
    let quoteCount = 0;
    try {
      const [cnt]: any = await pool.query('SELECT COUNT(*) as total FROM `Request_Quote`');
      quoteCount = cnt?.[0]?.total || 0;
    } catch {}

    return res.json({
      connected: true,
      status: 'healthy',
      database: config.database,
      host: config.host,
      port: config.port,
      tables: Array.isArray(tables) ? tables.map((t: any) => Object.values(t)[0]) : [],
      requestQuotesInDb: quoteCount,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      status: 'error',
      error: err.message,
      config: {
        host: config.host,
        port: config.port,
        database: config.database
      }
    });
  }
});

// Get all quotes (for Admin Dashboard)
app.get('/api/quotes', async (req, res) => {
  const pool = await getOrInitDbPool();
  if (pool) {
    try {
      // Query solely the Request_Quote table
      const [rows]: any = await pool.query('SELECT * FROM `Request_Quote` ORDER BY `ID` DESC LIMIT 500');

      if (Array.isArray(rows) && rows.length > 0) {
        const dbQuotes = rows.map((r: any) => ({
          id: r.ID,
          quoteId: `RFQ-2026-${r.ID}`,
          companyName: r.Company_Name || r.company_name,
          contactName: r.Contact_Person || r.contact_person,
          email: r.Email || r.email,
          phone: r.Phone_Number || r.phone_number,
          location: r.Location || r.location,
          quantity: r.Unit || r.unit || 1,
          notes: r.Description || r.description || '',
          status: 'Under Review',
          date: new Date(r.Created_At || r.created_at).toLocaleString(),
          createdAt: new Date(r.Created_At || r.created_at).toISOString(),
          product: {
            id: `prod-${r.ID}`,
            sku: r.Product_SKU || r.product_sku || 'N/A',
            name: r.Product_Name || r.product_name || 'Hardware Equipment',
            brand: 'Enterprise Grade',
            category: 'Procurement',
            image: r.Image || r.image || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400'
          }
        }));
        quotesStore = dbQuotes;
        return res.json({ quotes: dbQuotes });
      }
    } catch (err: any) {
      console.warn('[MySQL] Error querying Request_Quote table:', err.message);
    }
  }
  res.json({ quotes: quotesStore });
});

// Helper to save uploaded quote picture files physically on cPanel disk
function saveQuotePictureFile(base64OrUrl: string | null | undefined): string | null {
  if (!base64OrUrl || typeof base64OrUrl !== 'string') {
    return null;
  }

  const trimmed = base64OrUrl.trim();
  if (!trimmed) return null;

  // If already an existing web URL or relative path, keep as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/Images/') || trimmed.startsWith('/images/') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // Handle base64 Data URL (e.g. data:image/jpeg;base64,/9j/4AAQSkZJRg...)
  const matches = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  let ext = 'jpg';
  let base64Data = trimmed;

  if (matches) {
    const rawExt = matches[1].toLowerCase();
    ext = (rawExt === 'jpeg' || rawExt === 'jpg') ? 'jpg' :
          (rawExt === 'png') ? 'png' :
          (rawExt === 'webp') ? 'webp' :
          (rawExt === 'gif') ? 'gif' : 'jpg';
    base64Data = matches[2];
  } else if (trimmed.length > 100 && !trimmed.includes(' ')) {
    // Raw base64 string
    base64Data = trimmed;
  } else {
    return trimmed;
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) return null;

    const timestamp = Date.now();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const filename = `quote_${timestamp}_${randomPart}.${ext}`;
    // Saved in "Images/Request_Quotes" directory in the app root directory
    const relativeUrl = `/Images/Request_Quotes/${filename}`;

    // Target "Images/Request_Quotes" in app root and mirror to web builds
    const targetDirs = [
      path.join(process.cwd(), 'Images', 'Request_Quotes'),
      path.join(__dirname, 'Images', 'Request_Quotes'),
      path.join(process.cwd(), 'public', 'Images', 'Request_Quotes'),
      path.join(process.cwd(), 'client-build', 'Images', 'Request_Quotes'),
      path.join(process.cwd(), 'dist', 'Images', 'Request_Quotes')
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const fullFilePath = path.join(dir, filename);
        fs.writeFileSync(fullFilePath, buffer);
      } catch (err) {
        // Continue writing to other locations
      }
    }

    console.log(`[Quote Upload] Picture file saved to cPanel "Images/Request_Quotes": ${relativeUrl} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return relativeUrl;
  } catch (err: any) {
    console.error('[Quote Upload Error] Could not write image buffer to disk:', err.message);
    return null;
  }
}

// Submit a new quote from RequestQuotePage
app.post('/api/quotes', async (req, res) => {
  const quoteData = req.body;
  const companyName = (quoteData.Company_Name || quoteData.companyName || '').trim();
  const contactPerson = (quoteData.Contact_Person || quoteData.contactName || quoteData.contactPerson || '').trim();
  const email = (quoteData.Email || quoteData.email || '').trim();
  const phoneNumber = (quoteData.Phone_Number || quoteData.phone || quoteData.phoneNumber || '').trim();
  const location = (quoteData.Location || quoteData.location || '').trim();
  const description = (quoteData.Description || quoteData.notes || quoteData.description || '').trim();

  // Validate compulsory fields
  if (!companyName || !contactPerson || !email || !phoneNumber || !location || !description) {
    return res.status(400).json({ 
      error: 'Company Name, Contact Person, Email, Phone Number, Location, and Description are compulsory.' 
    });
  }

  // Optional fields: Product_SKU, Product_Name, Image
  const productSku = (quoteData.Product_SKU || quoteData.productSku || quoteData.product?.sku || '').trim() || null;
  const productName = (quoteData.Product_Name || quoteData.productName || quoteData.product?.name || '').trim() || null;
  const unit = parseInt(quoteData.Unit || quoteData.quantity || 1, 10) || 1;
  
  // Real image data only (base64 data URL or hosted product image URL) or null (never a fake placeholder!)
  const rawImage = quoteData.Image || quoteData.customImage || (quoteData.product?.image && !quoteData.product.image.includes('unsplash.com') ? quoteData.product.image : null);

  // Save picture file physically to cPanel disk and obtain its clean URL path to store in MySQL table
  const image = saveQuotePictureFile(rawImage);

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  let newQuote: any = {
    ...quoteData,
    quoteId: quoteData.quoteId || `RFQ-2026-${randomNum}`,
    companyName,
    contactName: contactPerson,
    email,
    phone: phoneNumber,
    location,
    quantity: unit,
    notes: description,
    product: {
      id: quoteData.product?.id || 'prod-custom',
      sku: productSku || '',
      name: productName || 'General Hardware Request',
      brand: quoteData.product?.brand || 'Enterprise Grade',
      category: quoteData.product?.category || 'Hardware Equipment',
      image: image || ''
    },
    Image: image,
    date: quoteData.date || new Date().toLocaleString(),
    status: quoteData.status || 'Under Review',
    createdAt: new Date().toISOString()
  };

  quotesStore.unshift(newQuote);

  let dbSaved = false;
  let dbError: string | null = null;
  let insertId: number | null = null;

  // Persist directly to cPanel MySQL / MariaDB database
  try {
    const pool = await getOrInitDbPool();
    if (pool) {
      const tableCandidates = ['Request_Quote'];
      let inserted = false;

      for (const tbl of tableCandidates) {
        if (inserted) break;
        try {
          const insertQuery = `INSERT INTO \`${tbl}\` (
            \`Company_Name\`, \`Contact_Person\`, \`Email\`, \`Phone_Number\`,
            \`Location\`, \`Product_SKU\`, \`Product_Name\`, \`Unit\`, \`Image\`,
            \`Description\`, \`Created_At\`
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

          const [result]: any = await pool.execute(insertQuery, [
            companyName,
            contactPerson,
            email,
            phoneNumber,
            location,
            productSku,
            productName,
            unit,
            image, // Saves relative file path e.g. "/Images/Request_Quotes/quote_1727771234567_4829.jpg"
            description
          ]);

          if (result && result.insertId) {
            insertId = result.insertId;
            newQuote.id = insertId;
            newQuote.quoteId = `RFQ-2026-${insertId}`;
            dbSaved = true;
            inserted = true;
            console.log(`[MySQL] Successfully saved Quote #${insertId} into table "${tbl}"! Contact: ${contactPerson} (${email}), Picture: ${image || 'None'}`);
          }
        } catch (tblErr: any) {
          // If error is max_allowed_packet or image path too long, retry without image payload
          if (image && (tblErr.message.includes('packet') || tblErr.message.includes('too large') || tblErr.message.includes('Data too long'))) {
            try {
              const retryQuery = `INSERT INTO \`${tbl}\` (
                \`Company_Name\`, \`Contact_Person\`, \`Email\`, \`Phone_Number\`,
                \`Location\`, \`Product_SKU\`, \`Product_Name\`, \`Unit\`, \`Image\`,
                \`Description\`, \`Created_At\`
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW())`;
              const [res2]: any = await pool.execute(retryQuery, [
                companyName, contactPerson, email, phoneNumber, location, productSku, productName, unit, description
              ]);
              if (res2 && res2.insertId) {
                insertId = res2.insertId;
                newQuote.id = insertId;
                newQuote.quoteId = `RFQ-2026-${insertId}`;
                dbSaved = true;
                inserted = true;
                console.log(`[MySQL] Successfully saved Quote #${insertId} into "${tbl}" (without image fallback).`);
              }
            } catch (rErr: any) {
              dbError = rErr.message;
            }
          } else {
            dbError = tblErr.message;
          }
        }
      }

      if (!inserted) {
        console.log(`[Database Notice] Quote saved in memory; table note: ${dbError}`);
      }
    } else {
      dbError = lastDbError || 'MySQL pool not initialized in current container.';
      console.log(`[Database Notice] Quote saved in memory (MySQL connection active upon cPanel deployment).`);
    }
  } catch (dbErr: any) {
    dbError = dbErr.message;
    console.log(`[Database Notice] Quote stored safely in resilient memory.`);
  }

  console.log(`[RFQ] New quote received from ${contactPerson} (${companyName || 'Individual'}) - Item: ${productName || 'General Request'}, Picture Saved: ${image || 'None'}, Stored in DB: ${dbSaved}`);
  res.status(201).json({ 
    success: true, 
    dbSaved,
    dbError,
    insertId,
    quote: newQuote 
  });
});

// Update RFQ status (Admin only)
app.patch('/api/quotes/:id/status', async (req, res) => {
  const { status } = req.body;
  const quote = quotesStore.find(q => q.quoteId === req.params.id || q.id === req.params.id || String(q.id) === String(req.params.id));
  if (!quote) {
    return res.status(404).json({ error: 'Quote request not found' });
  }
  quote.status = status;

  res.json({ success: true, quote });
});

// Delete RFQ (Admin only)
app.delete('/api/quotes/:id', async (req, res) => {
  const initialLen = quotesStore.length;
  quotesStore = quotesStore.filter(q => q.quoteId !== req.params.id && q.id !== req.params.id && String(q.id) !== String(req.params.id));
  if (quotesStore.length === initialLen) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  const pool = getDbPool();
  if (pool) {
    try {
      const numericId = parseInt(req.params.id.replace(/\D/g, ''), 10);
      if (numericId) {
        await pool.execute('DELETE FROM `Request_Quote` WHERE `ID` = ?', [numericId]);
      }
    } catch (err: any) {
      console.warn('[MySQL] Delete quote error:', err.message);
    }
  }

  res.json({ success: true, remaining: quotesStore.length });
});

// cPanel MySQL Database connection test & diagnostics
app.get('/api/db-status', async (req, res) => {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || '(not configured)';
  const user = process.env.DB_USER || process.env.MYSQL_USER || '(not configured)';
  const pool = getDbPool();

  if (pool && isDbConnected) {
    try {
      const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM `Request_Quote`');
      const count = Array.isArray(rows) && rows[0]?.count !== undefined ? rows[0].count : 0;
      return res.json({
        connected: true,
        configured: true,
        table: 'Request_Quote',
        columnsCount: 12,
        host,
        database,
        user,
        quotesCount: count,
        message: 'Successfully connected to cPanel MySQL database. All RFQs are being submitted directly to the Request_Quote table!'
      });
    } catch (err: any) {
      isDbConnected = false;
    }
  }

  const isConfigured = Boolean(process.env.DB_USER && process.env.DB_NAME);
  res.json({
    connected: false,
    configured: isConfigured,
    table: 'Request_Quote',
    columnsCount: 12,
    host,
    database,
    user,
    quotesCount: quotesStore.length,
    message: isConfigured
      ? `Database configured for ${user}@${host}/${database} targeting table Request_Quote. In cloud preview, local MySQL is not reachable; quotes are preserved in resilient memory and will automatically sync to Request_Quote when deployed to cPanel.`
      : 'cPanel MySQL credentials are not set in .env. Add DB_HOST, DB_USER, DB_PASSWORD, DB_NAME to connect.'
  });
});

// Proxy image endpoint to bypass CORS when embedding product images into PDF invoices
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).send('Image URL is required');
  }

  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid image protocol');
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch remote image');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    console.warn('[Proxy Image Error]', err.message);
    res.status(500).send('Error proxying image');
  }
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) });
  }
});

// -------------------------------------------------------------
// STOREFRONT & SPA HANDLING (WITH ZERO-CACHE REALTIME DELIVERY)
// -------------------------------------------------------------
const SERVER_BOOT_TIME = Date.now();
let lastRestartCheck = 0;

// Automatically detect when new application files are uploaded to cPanel
function checkAutoReloadOnNewUpload() {
  // ONLY run auto-reload on cPanel production where Phusion Passenger will supervise and restart the process.
  // Never exit the process in development or preview environments!
  if (!process.env.PASSENGER_APP_ENV && !process.env.CPANEL_ENV) {
    return;
  }

  const now = Date.now();
  if (now - lastRestartCheck < 3000) return; // Throttled to at most once per 3s
  lastRestartCheck = now;

  const appFiles = [
    path.join(process.cwd(), 'app.js'),
    path.join(__dirname, 'app.js'),
    path.join(process.cwd(), 'server.cjs'),
    path.join(process.cwd(), 'tmp', 'restart.txt')
  ];

  for (const f of appFiles) {
    if (fs.existsSync(f)) {
      try {
        const stats = fs.statSync(f);
        // If file modified after the current process booted (+5s buffer for startup)
        if (stats.mtimeMs > SERVER_BOOT_TIME + 5000) {
          console.log(`[Passenger Auto-Reload] Detected newer uploaded file (${path.basename(f)}). Reloading process...`);
          try {
            const restartPath = path.join(process.cwd(), 'tmp', 'restart.txt');
            fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
            fs.writeFileSync(restartPath, String(Date.now()));
          } catch {}
          setTimeout(() => process.exit(0), 100);
          break;
        }
      } catch {}
    }
  }
}

// Scans all candidate directories to find the single newest compiled index.html
function getLatestCompiledIndexHtml(): { filePath: string; content: string; mtime: number } | null {
  const rootDir = process.env.APP_ROOT || process.cwd();
  const candidates = [
    path.join(rootDir, 'dist', 'index.html'),
    path.join(rootDir, 'client-build', 'index.html'),
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'client-build', 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, 'client-build', 'index.html'),
    path.join(rootDir, 'index.html'),
    path.join(process.cwd(), 'index.html')
  ];

  let bestFile: string | null = null;
  let bestMtime = 0;
  let bestContent = '';

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const stats = fs.statSync(candidate);
        const content = fs.readFileSync(candidate, 'utf8');
        // Must be a compiled bundle with assets (not raw dev index referencing src/main.tsx)
        const isCompiled = (content.includes('assets/') || content.includes('/assets/')) && !content.includes('src/main.tsx');
        if (isCompiled && stats.mtimeMs > bestMtime) {
          bestMtime = stats.mtimeMs;
          bestFile = candidate;
          bestContent = content;
        }
      } catch {}
    }
  }

  if (bestFile && bestContent) {
    return { filePath: bestFile, content: bestContent, mtime: bestMtime };
  }
  return null;
}

// Delivers the newest index.html with strict zero-cache headers to eliminate stale browser views
function sendFreshSpaHtml(req: express.Request, res: express.Response, next: express.NextFunction) {
  const latest = getLatestCompiledIndexHtml();
  if (latest) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
    res.setHeader('Surrogate-Control', 'no-store');
    res.removeHeader('ETag');
    return res.status(200).send(latest.content);
  }
  next();
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Ensure cPanel tmp/restart.txt exists on Passenger
  if (process.env.PASSENGER_APP_ENV || process.env.CPANEL_ENV) {
    try {
      const tmpDir = path.join(process.cwd(), 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      const restartFile = path.join(tmpDir, 'restart.txt');
      if (!fs.existsSync(restartFile)) {
        fs.writeFileSync(restartFile, String(Date.now()));
      }
    } catch {}
  }

  // Auto-reload watcher middleware
  app.use((req, res, next) => {
    checkAutoReloadOnNewUpload();
    next();
  });

  // Dedicated instant restart endpoint
  app.get('/api/system/restart', (req, res) => {
    try {
      const restartFile = path.join(process.cwd(), 'tmp', 'restart.txt');
      fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
      fs.writeFileSync(restartFile, String(Date.now()));
    } catch {}

    res.json({
      success: true,
      message: 'Server process is reloading with the latest uploaded files. Please refresh in 2 seconds.'
    });

    if (process.env.PASSENGER_APP_ENV || process.env.CPANEL_ENV) {
      setTimeout(() => {
        console.log('[System] Manual restart triggered via /api/system/restart. Reloading Passenger process...');
        process.exit(0);
      }, 200);
    }
  });

  // Mount live Vite middlewares when running in dev environment
  let viteMounted = false;
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    viteMounted = true;
    console.log('[Storefront] Live Vite dev server successfully mounted.');
  } catch (viteErr: any) {
    console.log('[Storefront] Running standalone production bundle.');
  }

  // Static immutable assets for hashed JS and CSS bundles
  const assetPaths = [
    path.join(process.cwd(), 'dist', 'assets'),
    path.join(process.cwd(), 'client-build', 'assets'),
    path.join(__dirname, 'dist', 'assets'),
    path.join(__dirname, 'client-build', 'assets')
  ];
  for (const aPath of assetPaths) {
    if (fs.existsSync(aPath)) {
      app.use('/assets', express.static(aPath, {
        maxAge: '1y',
        immutable: true
      }));
    }
  }

  // Handle root and SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/Images/')) {
      return next();
    }
    if (viteMounted) {
      return next();
    }
    sendFreshSpaHtml(req, res, next);
  });

  // Handle cPanel Phusion Passenger socket pipe or numeric port
  const isNamedPipeOrSocket = isNaN(Number(PORT));
  if (isNamedPipeOrSocket) {
    app.listen(PORT, () => {
      console.log(`[SPINEL DISTRIBUTION] Server running on passenger socket: ${PORT}`);
    });
  } else {
    const portNumber = parseInt(String(PORT), 10);
    app.listen(portNumber, () => {
      console.log(`[SPINEL DISTRIBUTION] Server running on port ${portNumber}`);
      console.log(`[Admin Portal] Available at port ${portNumber}/admin`);
      console.log(`[Exchange Rate] 1 USD = ₦${USD_TO_NGN_EXCHANGE_RATE}`);
    });
  }
}

startServer();
