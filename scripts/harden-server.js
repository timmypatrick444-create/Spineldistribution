const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.ts');
let code = fs.readFileSync(serverPath, 'utf8');

// 1. Imports
code = code.replace(
  "import fs from 'fs';",
  "import fs from 'fs';\nimport dns from 'dns';\nimport crypto from 'crypto';"
);

// 2. Sensitive files blocking & controlled body limits
const oldBodyLimits = `// High body limits to easily receive thousands of product uploads via JSON or CSV
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));`;

const newBodyLimits = `// Security Middleware: Deny direct HTTP access to configuration, secrets, and server source files
app.use((req, res, next) => {
  const cleanPath = (req.path || '').toLowerCase();
  const forbiddenPatterns = [
    /^\\/\\.env/i,
    /db_config\\.json/i,
    /config\\.json/i,
    /\\.sql$/i,
    /package\\.json/i,
    /package-lock\\.json/i,
    /tsconfig\\.json/i,
    /server\\.(ts|cjs|js)/i,
    /app\\.js/i,
    /^\\/\\.git/i,
    /^\\/scripts\\//i,
    /cpanel\\.env/i,
    /cpanel-deploy\\.zip/i
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(cleanPath)) {
      return res.status(403).json({ error: 'Access forbidden.' });
    }
  }
  next();
});

// Tight request body limits: 256kb for ordinary requests, 6MB for quote images, 10MB for admin batch imports
app.use((req, res, next) => {
  if (req.path === '/api/quotes' && req.method === 'POST') {
    return express.json({ limit: '6mb' })(req, res, next);
  }
  if (req.path === '/api/products/batch' && req.method === 'POST') {
    return express.json({ limit: '10mb' })(req, res, next);
  }
  return express.json({ limit: '256kb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '256kb' }));`;

code = code.replace(oldBodyLimits, newBodyLimits);

// 3. ADMIN_ACCESS_KEY hardening
const oldAdminKey = `const ADMIN_TECHNICAL_EMAIL = (process.env.ADMIN_TECHNICAL_EMAIL || 'admin@spineldistribution.com').replace(/^["']|["']$/g, '').trim().toLowerCase();
const ADMIN_ACCESS_KEY = (process.env.ADMIN_ACCESS_KEY || 'SPINEL_SECURE_ACCESS_2026_KEY').replace(/^["']|["']$/g, '').trim();`;

const newAdminKey = `const ADMIN_TECHNICAL_EMAIL = (process.env.ADMIN_TECHNICAL_EMAIL || 'admin@spineldistribution.com').replace(/^["']|["']$/g, '').trim().toLowerCase();

// Hardened Admin Access Key: Reject fallback default, refuse startup in production if missing/weak
let resolvedAdminKey = (process.env.ADMIN_ACCESS_KEY || '').replace(/^["']|["']$/g, '').trim();
if (resolvedAdminKey === 'SPINEL_SECURE_ACCESS_2026_KEY') {
  resolvedAdminKey = '';
}

const isProduction = process.env.NODE_ENV === 'production' || 
  process.env.PASSENGER_APP_ENV === 'production' || 
  Boolean(process.env.PASSENGER_BASE_URI) || 
  Boolean(process.env.cPanel);

if (!resolvedAdminKey || resolvedAdminKey.length < 16) {
  if (isProduction) {
    console.error('================================================================');
    console.error('[CRITICAL SECURITY ERROR] Production startup refused:');
    console.error('A strong ADMIN_ACCESS_KEY (at least 16 characters) must be set in .env');
    console.error('or cPanel Environment Variables before starting in production.');
    console.error('Default fallback admin key has been permanently retired.');
    console.error('================================================================');
    process.exit(1);
  } else {
    // In development mode, generate an ephemeral cryptographically secure random key
    resolvedAdminKey = crypto.randomBytes(24).toString('hex');
    console.warn('================================================================');
    console.warn('[SECURITY NOTICE] No strong ADMIN_ACCESS_KEY configured in dev environment.');
    console.warn(\`Generated ephemeral developer admin key for this session:\`);
    console.warn(\`Email: \${ADMIN_TECHNICAL_EMAIL}\`);
    console.warn(\`Key:   \${resolvedAdminKey}\`);
    console.warn('================================================================');
  }
}
const ADMIN_ACCESS_KEY = resolvedAdminKey;`;

code = code.replace(oldAdminKey, newAdminKey);

// 4. Rate Limiting, Brute-Force Monitoring, Session Management & Helpers
const oldRequireAdmin = `// Active admin session tokens in memory
const activeAdminTokens = new Set<string>();

// Middleware to verify admin token
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Admin access required.' });
  }
  next();
}`;

const newSecurityHelpers = `// -------------------------------------------------------------
// RATE LIMITING, BRUTE-FORCE MONITORING & SESSION SECURITY
// -------------------------------------------------------------
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitBucket>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateLimits.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) {
    return false;
  }
  bucket.count++;
  return true;
}

// Clean up stale rate limits every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimits.entries()) {
    if (now > val.resetAt) rateLimits.delete(key);
  }
}, 120000);

// Failed login monitoring & lockout (5 consecutive failed attempts => 15-minute lockout)
interface FailedLoginTracker {
  attempts: number;
  lockedUntil: number;
}
const failedLogins = new Map<string, FailedLoginTracker>();

function recordFailedLogin(identifier: string): { locked: boolean; remainingAttempts: number; lockRemainingMinutes: number } {
  const now = Date.now();
  const record = failedLogins.get(identifier) || { attempts: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const lockRemainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { locked: true, remainingAttempts: 0, lockRemainingMinutes };
  }

  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
    failedLogins.set(identifier, record);
    return { locked: true, remainingAttempts: 0, lockRemainingMinutes: 15 };
  }

  failedLogins.set(identifier, record);
  return { locked: false, remainingAttempts: Math.max(0, 5 - record.attempts), lockRemainingMinutes: 0 };
}

function isLoginLocked(identifier: string): { locked: boolean; lockRemainingMinutes: number } {
  const now = Date.now();
  const record = failedLogins.get(identifier);
  if (record && record.lockedUntil > now) {
    return { locked: true, lockRemainingMinutes: Math.ceil((record.lockedUntil - now) / 60000) };
  }
  return { locked: false, lockRemainingMinutes: 0 };
}

function clearFailedLogins(identifier: string) {
  failedLogins.delete(identifier);
}

// Input validation and sanitization helpers
function isValidEmail(email: any): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (clean.length > 254 || clean.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

function isValidPhone(phone: any): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\\s\\-\\(\\)\\.]/g, '');
  return /^\\+?[0-9]{7,18}$/.test(clean);
}

function sanitizeText(val: any, maxLen = 500): string {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

// Active sessions in memory
const activeAdminTokens = new Set<string>();

interface CustomerSession {
  userId: string | number;
  email: string;
  fullName: string;
  createdAt: number;
}
const activeCustomerTokens = new Map<string, CustomerSession>();

// Middleware to verify admin token
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Administrator access required.' });
  }
  next();
}

// Middleware to verify customer OR admin token for customer orders
async function authenticateUserOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  // Admin access
  if (activeAdminTokens.has(token)) {
    (req as any).user = { role: 'admin', email: ADMIN_TECHNICAL_EMAIL };
    return next();
  }

  // Customer active session
  const session = activeCustomerTokens.get(token);
  if (session) {
    (req as any).user = {
      role: 'customer',
      email: session.email,
      fullName: session.fullName,
      userId: session.userId
    };
    return next();
  }

  // Session re-hydration if token format is valid
  if (token.startsWith('usr_token_')) {
    const parts = token.split('_');
    const timestamp = parseInt(parts[2], 10);
    if (!isNaN(timestamp) && (Date.now() - timestamp) < 30 * 24 * 60 * 60 * 1000) {
      const candidateEmail = (req.query.email as string) || (req.body?.customerEmail as string);
      if (candidateEmail && isValidEmail(candidateEmail)) {
        try {
          const dbUser = await findUserByEmail(candidateEmail.toLowerCase().trim());
          if (dbUser) {
            activeCustomerTokens.set(token, {
              userId: dbUser.id,
              email: dbUser.email,
              fullName: dbUser.fullName,
              createdAt: timestamp
            });
            (req as any).user = { role: 'customer', email: dbUser.email, userId: dbUser.id, fullName: dbUser.fullName };
            return next();
          }
        } catch {}
      }
    }
  }

  return res.status(401).json({ error: 'Session expired or unauthorized. Please log in.' });
}

// Paystack payment verification helper (Confirm status, amount in NGN, currency, reference & prevent replay)
const usedPaymentReferences = new Set<string>();

async function verifyPaystackTransaction(reference: string, expectedAmountNGN: number): Promise<{ verified: boolean; error?: string; gatewayData?: any }> {
  const cleanRef = String(reference || '').trim();
  if (!cleanRef) {
    return { verified: false, error: 'Transaction reference is missing.' };
  }

  if (usedPaymentReferences.has(cleanRef)) {
    return { verified: false, error: 'This payment reference has already been processed.' };
  }

  if (PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.startsWith('sk_')) {
    try {
      const response = await fetch(\`https://api.paystack.co/transaction/verify/\${encodeURIComponent(cleanRef)}\`, {
        headers: {
          'Authorization': \`Bearer \${PAYSTACK_SECRET_KEY}\`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return { verified: false, error: \`Paystack verification returned HTTP \${response.status}.\` };
      }

      const resJson: any = await response.json();
      if (!resJson.status || !resJson.data) {
        return { verified: false, error: resJson.message || 'Payment verification failed at gateway.' };
      }

      const data = resJson.data;

      if (data.status !== 'success') {
        return { verified: false, error: \`Transaction was not successful (Status: \${data.status}).\` };
      }

      if (data.currency !== 'NGN') {
        return { verified: false, error: \`Invalid transaction currency: \${data.currency}, expected NGN.\` };
      }

      if (data.reference !== cleanRef) {
        return { verified: false, error: 'Transaction reference mismatch.' };
      }

      const expectedKobo = Math.round(expectedAmountNGN * 100);
      const paidKobo = data.amount;
      if (expectedKobo > 0 && Math.abs(paidKobo - expectedKobo) > 100) {
        return {
          verified: false,
          error: \`Transaction amount mismatch. Paid: \${(paidKobo / 100).toFixed(2)} NGN, Expected: \${expectedAmountNGN.toFixed(2)} NGN.\`
        };
      }

      usedPaymentReferences.add(cleanRef);
      return { verified: true, gatewayData: data };
    } catch (err: any) {
      console.error('[Paystack API Verification Error]', err);
      return { verified: false, error: 'Could not contact Paystack verification service. Please try again.' };
    }
  } else {
    // Development fallback
    if (cleanRef.startsWith('PSTK_') || cleanRef.startsWith('pstk_') || cleanRef.startsWith('SPN_PAY_')) {
      usedPaymentReferences.add(cleanRef);
      return { verified: true, gatewayData: { reference: cleanRef, status: 'success', simulated: true } };
    }
    return { verified: false, error: 'Invalid payment reference format.' };
  }
}`;

code = code.replace(oldRequireAdmin, newSecurityHelpers);

// 5. Customer Auth endpoints hardening (register, verify-otp, login, forgot-password, reset-password)
// Step 1: register-initiate
code = code.replace(
  "app.post('/api/auth/register-initiate', async (req, res) => {",
  `app.post('/api/auth/register-initiate', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(\`reg_\${clientIp}\`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many registration requests from this network. Please wait a few minutes.' });
  }`
);
code = code.replace(
  "if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {",
  "if (!isValidEmail(cleanEmail)) {"
);
code = code.replace(
  "if (!rawPassword || rawPassword.length < 6) {",
  "if (!rawPassword || rawPassword.length < 8) {"
);

// Step 2: verify-otp
code = code.replace(
  "app.post('/api/auth/verify-otp', async (req, res) => {",
  `app.post('/api/auth/verify-otp', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(\`otp_v_\${clientIp}\`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many verification attempts. Please wait a few minutes.' });
  }`
);
code = code.replace(
  "const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;\n    return res.status(200).json({\n      success: true,\n      message: 'Account is already verified. Signing you in...',",
  "const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;\n    activeCustomerTokens.set(token, { userId: dbUser.id, email: cleanEmail, fullName: dbUser.fullName, createdAt: Date.now() });\n    return res.status(200).json({\n      success: true,\n      message: 'Account is already verified. Signing you in...',"
);
code = code.replace(
  "const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;\n\n    return res.status(200).json({\n      success: true,\n      message: 'Account verified and activated successfully!',",
  "const token = `usr_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;\n    activeCustomerTokens.set(token, { userId: verifiedUser?.id || dbUser?.id || `usr_${Date.now()}`, email: cleanEmail, fullName: verifiedUser?.fullName || pending?.fullName || 'Valued Customer', createdAt: Date.now() });\n\n    return res.status(200).json({\n      success: true,\n      message: 'Account verified and activated successfully!',"
);

// Step 4: Login with lockout & monitoring
const oldLoginBlock = `// Step 4: Login for registered users with email and hashed password verification
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
        emailSent: emailResult.success
      });
    }

    const token = \`usr_token_\${Date.now()}_\${Math.random().toString(36).substring(2, 10)}\`;
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
});`;

const newLoginBlock = `// Step 4: Login for registered users with rate limiting and failed attempt monitoring
app.post('/api/auth/login', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limiting: 15 login requests per 15 minutes per IP
  if (!checkRateLimit(\`login_\${clientIp}\`, 15, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many login attempts from this network. Please try again in a few minutes.' });
  }

  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const rawPassword = (password || '').trim();

  if (!cleanEmail || !rawPassword) {
    return res.status(400).json({ error: 'Please enter both your registered email and password.' });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid official business email address.' });
  }

  // Check brute force lockout for IP and email
  const ipLock = isLoginLocked(\`ip_\${clientIp}\`);
  if (ipLock.locked) {
    return res.status(429).json({
      error: \`Too many failed login attempts. This connection is temporarily locked for security. Please try again in \${ipLock.lockRemainingMinutes} minutes.\`
    });
  }

  const emailLock = isLoginLocked(\`usr_\${cleanEmail}\`);
  if (emailLock.locked) {
    return res.status(429).json({
      error: \`Too many failed login attempts for this account. Locked for \${emailLock.lockRemainingMinutes} minutes. You may reset your password if needed.\`
    });
  }

  try {
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      recordFailedLogin(\`ip_\${clientIp}\`);
      recordFailedLogin(\`usr_\${cleanEmail}\`);
      return res.status(401).json({
        error: 'Invalid email address or password. Please verify your credentials and try again.'
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
        const derivedKey = crypto.scryptSync(rawPassword, salt, 64);
        passwordMatches = crypto.timingSafeEqual(keyBuffer, derivedKey);
      } catch {}
    }

    if (!passwordMatches) {
      const lockRes = recordFailedLogin(\`usr_\${cleanEmail}\`);
      recordFailedLogin(\`ip_\${clientIp}\`);
      if (lockRes.locked) {
        return res.status(429).json({
          error: \`Too many failed password attempts. Account locked for 15 minutes for your protection.\`
        });
      }
      return res.status(401).json({
        error: \`Incorrect password. Please verify your password and try again. (\${lockRes.remainingAttempts} attempts remaining)\`
      });
    }

    // Login succeeded: Clear failed attempts
    clearFailedLogins(\`ip_\${clientIp}\`);
    clearFailedLogins(\`usr_\${cleanEmail}\`);

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
        emailSent: emailResult.success
      });
    }

    const token = \`usr_token_\${Date.now()}_\${Math.random().toString(36).substring(2, 10)}\`;
    activeCustomerTokens.set(token, {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: Date.now()
    });

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
    return res.status(500).json({ error: 'An unexpected error occurred during authentication. Please try again later.' });
  }
});`;

code = code.replace(oldLoginBlock, newLoginBlock);

// 6. Protect Diagnostics & System Routes
code = code.replace(
  "app.get('/api/system/health', async (req, res) => {",
  "app.get('/api/system/health', requireAdmin, async (req, res) => {"
);
code = code.replace(
  "app.get('/api/system/email-config', (req, res) => {",
  "app.get('/api/system/email-config', requireAdmin, (req, res) => {"
);
code = code.replace(
  "app.post('/api/system/email-config', async (req, res) => {",
  "app.post('/api/system/email-config', requireAdmin, async (req, res) => {"
);
code = code.replace(
  "app.all('/api/system/test-email', async (req, res) => {",
  "app.all('/api/system/test-email', requireAdmin, async (req, res) => {"
);

// 7. Admin Login Rate Limiting & Lockout
const oldAdminLogin = `// Admin login with Technical Email ID and Access Key
app.post('/api/admin/login', (req, res) => {
  const { technicalEmail, accessKey } = req.body;

  if (!technicalEmail || !accessKey) {
    return res.status(400).json({ error: 'Both Technical Email ID and Access Key are required.' });
  }

  const inputEmail = String(technicalEmail).trim().toLowerCase();
  const inputKey = String(accessKey).trim();

  if (inputEmail === ADMIN_TECHNICAL_EMAIL && inputKey === ADMIN_ACCESS_KEY) {
    const token = \`adm_token_\${Date.now()}_\${Math.random().toString(36).substring(2, 12)}\`;
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      email: inputEmail,
      role: 'admin'
    });
  }

  return res.status(401).json({ error: 'Invalid Technical Email ID or Access Key. Access denied.' });
});`;

const newAdminLogin = `// Admin login with Technical Email ID, Access Key, rate limiting, and brute-force lockout
app.post('/api/admin/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limit: 5 admin login attempts per 15 minutes per IP
  if (!checkRateLimit(\`adm_login_\${clientIp}\`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many administrative login attempts. Please wait 15 minutes.' });
  }

  const { technicalEmail, accessKey } = req.body;

  if (!technicalEmail || !accessKey) {
    return res.status(400).json({ error: 'Both Technical Email ID and Access Key are required.' });
  }

  const inputEmail = String(technicalEmail).trim().toLowerCase();
  const inputKey = String(accessKey).trim();

  // Check lockout
  const ipLock = isLoginLocked(\`adm_ip_\${clientIp}\`);
  if (ipLock.locked) {
    return res.status(429).json({
      error: \`Too many failed admin login attempts. Administrative console access is locked for \${ipLock.lockRemainingMinutes} minutes.\`
    });
  }

  // Constant-time comparison for admin access key to avoid timing side-channels
  const emailMatches = inputEmail === ADMIN_TECHNICAL_EMAIL;
  let keyMatches = false;
  if (inputKey.length === ADMIN_ACCESS_KEY.length) {
    try {
      keyMatches = crypto.timingSafeEqual(Buffer.from(inputKey), Buffer.from(ADMIN_ACCESS_KEY));
    } catch {}
  }

  if (emailMatches && keyMatches) {
    clearFailedLogins(\`adm_ip_\${clientIp}\`);
    const token = \`adm_token_\${Date.now()}_\${crypto.randomBytes(16).toString('hex')}\`;
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      email: inputEmail,
      role: 'admin'
    });
  }

  const lockRes = recordFailedLogin(\`adm_ip_\${clientIp}\`);
  if (lockRes.locked) {
    return res.status(429).json({
      error: 'Too many failed admin login attempts. Administrative console access is now locked for 15 minutes.'
    });
  }

  return res.status(401).json({
    error: \`Invalid Technical Email ID or Access Key. Access denied. (\${lockRes.remainingAttempts} attempts remaining)\`
  });
});`;

code = code.replace(oldAdminLogin, newAdminLogin);

// 8. Batch product upload hardening
const oldBatchProducts = `// Admin Bulk Product Upload API (Handles thousands of products with zero hindrance)
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

    const validId = item.id || \`prod-\${item.sku ? String(item.sku).toLowerCase().replace(/[^a-z0-9]/g, '-') : Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7)}\`;
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
  console.log(\`[Bulk Upload] Successfully ingested \${added} new and \${updated} updated products in \${durationMs}ms. Total catalog: \${productCatalog.length}\`);

  res.json({
    success: true,
    added,
    updated,
    totalProcessed: products.length,
    newTotalCatalog: productCatalog.length,
    durationMs
  });
});`;

const newBatchProducts = `// Admin Bulk Product Upload API (Controlled batching, concurrency lock, per-record validation)
let isBatchImportRunning = false;

app.post('/api/products/batch', requireAdmin, async (req, res) => {
  if (isBatchImportRunning) {
    return res.status(429).json({ error: 'Another batch product import is currently running. Please wait for it to complete.' });
  }

  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Expected non-empty array of products.' });
  }

  // Maximum batch payload size: 500 records per request
  const MAX_BATCH_SIZE = 500;
  if (products.length > MAX_BATCH_SIZE) {
    return res.status(400).json({
      error: \`Batch payload exceeds the safe limit of \${MAX_BATCH_SIZE} items. Please split large imports into smaller batches.\`
    });
  }

  isBatchImportRunning = true;
  const startTime = Date.now();
  let added = 0;
  let updated = 0;
  const errors: { index: number; sku?: string; error: string }[] = [];

  try {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const itemIndex = i + j;
        const item = chunk[j];

        if (!item || typeof item !== 'object') {
          errors.push({ index: itemIndex, error: 'Product item must be a valid JSON object.' });
          continue;
        }

        const name = sanitizeText(item.name || '', 200);
        if (!name) {
          errors.push({ index: itemIndex, sku: item.sku, error: 'Product name is required.' });
          continue;
        }

        const priceUSD = typeof item.priceUSD === 'number' ? item.priceUSD : parseFloat(String(item.priceUSD || '0')) || 0;
        if (priceUSD < 0 || isNaN(priceUSD)) {
          errors.push({ index: itemIndex, sku: item.sku, error: 'Product price must be a non-negative number.' });
          continue;
        }

        const sku = sanitizeText(item.sku || '', 100);
        const validId = sanitizeText(item.id || '', 100) || \`prod-\${sku ? sku.toLowerCase().replace(/[^a-z0-9]/g, '-') : Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7)}\`;
        const stock = typeof item.stock === 'number' ? item.stock : parseInt(String(item.stock || '0'), 10) || 0;

        const normalizedItem: Product = {
          ...item,
          id: validId,
          name,
          category: sanitizeText(item.category || 'General Industrial', 100),
          subcategory: sanitizeText(item.subcategory || '', 100),
          brand: sanitizeText(item.brand || 'Spinel Distribution', 100),
          sku: sku || validId,
          description: sanitizeText(item.description || name, 2000),
          priceUSD: Math.round(priceUSD * 100) / 100,
          stock: Math.max(0, stock),
          images: Array.isArray(item.images) && item.images.length > 0 
            ? item.images.filter((img: any) => typeof img === 'string' && img.length > 5)
            : ['https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'],
          rating: typeof item.rating === 'number' && item.rating >= 0 && item.rating <= 5 ? item.rating : 4.5,
          reviewCount: typeof item.reviewCount === 'number' && item.reviewCount >= 0 ? item.reviewCount : 10,
          specs: item.specs && typeof item.specs === 'object' ? item.specs : {},
          features: Array.isArray(item.features) ? item.features.map((f: any) => sanitizeText(String(f), 200)) : ['Industrial Grade Quality', 'Spinel Guaranteed Warranty'],
          inStock: stock > 0,
          createdAt: item.createdAt || new Date().toISOString()
        };

        const existingIndex = productCatalog.findIndex(p => (sku && p.sku === sku) || (validId && p.id === validId));
        if (existingIndex >= 0) {
          const existing = productCatalog[existingIndex];
          productCatalog[existingIndex] = { ...existing, ...normalizedItem, id: existing.id || validId };
          updated++;
        } else {
          productCatalog.unshift(normalizedItem);
          added++;
        }
      }

      // Small async pause to yield event loop between chunks
      await new Promise(resolve => setImmediate(resolve));
    }

    const durationMs = Date.now() - startTime;
    console.log(\`[Batch Import] Processed \${products.length} items (\${added} added, \${updated} updated, \${errors.length} failed) in \${durationMs}ms.\`);

    res.json({
      success: true,
      added,
      updated,
      failed: errors.length,
      errors: errors.slice(0, 25),
      totalProcessed: products.length,
      newTotalCatalog: productCatalog.length,
      durationMs
    });
  } catch (err: any) {
    console.error('[Batch Import Error]', err);
    res.status(500).json({ error: 'Internal server error processing batch product import.' });
  } finally {
    isBatchImportRunning = false;
  }
});`;

code = code.replace(oldBatchProducts, newBatchProducts);

// 9. Orders & Paystack Endpoints
const oldOrdersBlock = `// Create New Order
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

  const orderNumber = \`SPN-\${new Date().getFullYear()}-\${Math.floor(100000 + Math.random() * 900000)}\`;

  const isPaid = req.body.paymentStatus === 'paid' || Boolean(paymentReference);
  const resolvedPaymentStatus: 'paid' | 'unpaid' = isPaid ? 'paid' : 'unpaid';
  const resolvedStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' = 
    req.body.status || (isPaid ? 'completed' : 'pending');

  const newOrder: Order = {
    id: \`ord-\${Date.now().toString(36)}-\${Math.random().toString(36).substring(2, 6)}\`,
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
    paymentReference: paymentReference || (isPaid ? \`pstk_\${Date.now()}\` : ''),
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
  order.paymentReference = paymentReference || \`pstk_\${Date.now()}\`;
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
  const reference = \`SPN_PAY_\${Date.now()}_\${Math.floor(Math.random() * 10000)}\`;

  // If secret key is provided, we can call Paystack API; otherwise return standard reference for inline JS popup
  res.json({
    status: true,
    message: 'Authorization URL created',
    data: {
      reference,
      access_code: \`acc_\${reference}\`,
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
});`;

const newOrdersBlock = `// Create New Order
app.post('/api/orders', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(\`order_create_\${clientIp}\`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many order requests. Please wait a moment.' });
  }

  const { customerEmail, customerName, shippingAddress, items, currency, paymentMethod, paymentReference } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  const cleanEmail = (customerEmail || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'A valid customer email address is required.' });
  }

  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return res.status(400).json({ error: 'Valid shipping address details are required.' });
  }

  let subtotalUSD = 0;
  const validatedItems = [];
  for (const item of items) {
    const qty = Math.max(1, parseInt(String(item.quantity || '1'), 10) || 1);
    const price = typeof item.priceUSD === 'number' ? Math.max(0, item.priceUSD) : Math.max(0, parseFloat(String(item.priceUSD || '0')) || 0);
    subtotalUSD += price * qty;
    validatedItems.push({
      ...item,
      quantity: qty,
      priceUSD: price,
      name: sanitizeText(item.name || 'Industrial Equipment', 200),
      sku: sanitizeText(item.sku || '', 100)
    });
  }

  const shippingFeeUSD = 0;
  const totalUSD = Math.round(subtotalUSD * 100) / 100;
  const subtotalNGN = Math.round(subtotalUSD * USD_TO_NGN_EXCHANGE_RATE * 100) / 100;
  const shippingFeeNGN = 0;
  const totalNGN = Math.round(totalUSD * USD_TO_NGN_EXCHANGE_RATE * 100) / 100;

  const orderNumber = \`SPN-\${new Date().getFullYear()}-\${Math.floor(100000 + Math.random() * 900000)}\`;

  // Payment status validation
  let isPaid = false;
  if (paymentReference) {
    const verifyRes = await verifyPaystackTransaction(paymentReference, totalNGN);
    if (verifyRes.verified) {
      isPaid = true;
    }
  }

  const resolvedPaymentStatus: 'paid' | 'unpaid' = isPaid ? 'paid' : 'unpaid';
  const resolvedStatus = isPaid ? 'completed' : 'pending';

  const cleanShippingAddress = {
    fullName: sanitizeText(shippingAddress.fullName || customerName || 'Valued Customer', 150),
    companyName: sanitizeText(shippingAddress.companyName || '', 150),
    email: cleanEmail,
    phone: sanitizeText(shippingAddress.phone || '', 50),
    address: sanitizeText(shippingAddress.address || '', 300),
    city: sanitizeText(shippingAddress.city || '', 100),
    state: sanitizeText(shippingAddress.state || '', 100),
    country: sanitizeText(shippingAddress.country || 'Nigeria', 100),
    postalCode: sanitizeText(shippingAddress.postalCode || '', 30)
  };

  const newOrder: Order = {
    id: \`ord-\${Date.now().toString(36)}-\${Math.random().toString(36).substring(2, 6)}\`,
    orderNumber,
    customerEmail: cleanEmail,
    customerName: cleanShippingAddress.fullName,
    shippingAddress: cleanShippingAddress,
    items: validatedItems,
    subtotalUSD,
    subtotalNGN,
    shippingFeeUSD,
    shippingFeeNGN,
    totalUSD,
    totalNGN,
    exchangeRateUsed: USD_TO_NGN_EXCHANGE_RATE,
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    status: resolvedStatus,
    paymentMethod: paymentMethod || 'paystack',
    paymentReference: isPaid ? String(paymentReference).trim() : '',
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

// Mark order as paid (Strictly verified server-side with Paystack API)
app.post('/api/orders/:id/pay', authenticateUserOrAdmin, async (req, res) => {
  const { paymentReference } = req.body;
  const user = (req as any).user;

  const order = ordersStore.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Authorization: Customer can only pay for their own order
  if (user.role !== 'admin' && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this order.' });
  }

  if (order.paymentStatus === 'paid') {
    return res.json(order);
  }

  if (!paymentReference) {
    return res.status(400).json({ error: 'Payment reference is required.' });
  }

  // Verify transaction status, amount, currency, and reference server-side with Paystack API
  const verifyRes = await verifyPaystackTransaction(paymentReference, order.totalNGN);
  if (!verifyRes.verified) {
    return res.status(400).json({
      error: verifyRes.error || 'Payment could not be verified by the payment gateway.'
    });
  }

  order.paymentStatus = 'paid';
  order.status = 'completed';
  order.paymentReference = String(paymentReference).trim();

  if (supabaseClient) {
    supabaseClient.from('orders')
      .update({ paymentStatus: 'paid', status: 'completed', paymentReference: order.paymentReference })
      .eq('id', order.id)
      .then(() => {})
      .catch((e: any) => console.warn('[Supabase Sync Error]', e));
  }

  res.json(order);
});

// Get orders (Strictly Authenticated: Customer gets their own orders, Admin gets all)
app.get('/api/orders', authenticateUserOrAdmin, (req, res) => {
  const user = (req as any).user;

  if (user.role === 'admin') {
    const { email } = req.query;
    if (email) {
      const userOrders = ordersStore.filter(o => o.customerEmail.toLowerCase() === String(email).toLowerCase().trim());
      return res.json(userOrders);
    }
    return res.json(ordersStore);
  }

  // Regular authenticated customer: restricted strictly to their own orders
  const customerOrders = ordersStore.filter(o => o.customerEmail.toLowerCase() === user.email.toLowerCase());
  res.json(customerOrders);
});

// Get single order (Strictly Authenticated: Order owner or Admin)
app.get('/api/orders/:id', authenticateUserOrAdmin, (req, res) => {
  const user = (req as any).user;
  const order = ordersStore.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (user.role !== 'admin' && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view this order.' });
  }

  res.json(order);
});

// Update order status (Admin only)
app.patch('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const order = ordersStore.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  order.status = status;
  res.json(order);
});

// Paystack payment initialize proxy
app.post('/api/paystack/initialize', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(\`pstk_init_\${clientIp}\`, 30, 15 * 60 * 1000)) {
    return res.status(429).json({ status: false, message: 'Too many payment requests.' });
  }

  const { email, amountInNgn } = req.body;
  const reference = \`SPN_PAY_\${Date.now()}_\${Math.floor(Math.random() * 10000)}\`;

  res.json({
    status: true,
    message: 'Authorization URL created',
    data: {
      reference,
      access_code: \`acc_\${reference}\`,
      publicKey: PAYSTACK_PUBLIC_KEY,
      amountKobo: Math.round((amountInNgn || 1000) * 100),
      currency: 'NGN'
    }
  });
});

// Paystack payment verification (Strict server-side validation against Paystack API)
app.post('/api/paystack/verify', async (req, res) => {
  const { reference, orderId, expectedAmountNGN } = req.body;
  if (!reference) {
    return res.status(400).json({ status: false, message: 'Reference is required.' });
  }

  let expectedAmount = typeof expectedAmountNGN === 'number' ? expectedAmountNGN : 0;
  if (orderId) {
    const order = ordersStore.find(o => o.id === orderId || o.orderNumber === orderId);
    if (order) expectedAmount = order.totalNGN;
  }

  const verifyRes = await verifyPaystackTransaction(reference, expectedAmount);
  if (!verifyRes.verified) {
    return res.status(400).json({
      status: false,
      message: verifyRes.error || 'Payment verification failed.'
    });
  }

  res.json({
    status: true,
    message: 'Payment verification successful',
    data: {
      reference,
      status: 'success',
      gateway_response: 'Successful'
    }
  });
});`;

code = code.replace(oldOrdersBlock, newOrdersBlock);

// 10. Quotes, db-status, Contact, Proxy-image, and Error Handler
code = code.replace(
  "app.get('/api/db-status', async (req, res) => {",
  "app.get('/api/db-status', requireAdmin, async (req, res) => {"
);
code = code.replace(
  "app.get('/api/quotes', async (req, res) => {",
  "app.get('/api/quotes', requireAdmin, async (req, res) => {"
);
code = code.replace(
  "app.patch('/api/quotes/:id/status', async (req, res) => {",
  "app.patch('/api/quotes/:id/status', requireAdmin, async (req, res) => {"
);
code = code.replace(
  "app.delete('/api/quotes/:id', async (req, res) => {",
  "app.delete('/api/quotes/:id', requireAdmin, async (req, res) => {"
);

// Remove duplicate db-status
const dupDbStatus = `// cPanel MySQL Database connection test & diagnostics
app.get('/api/db-status', async (req, res) => {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || '(not configured)';
  const user = process.env.DB_USER || process.env.MYSQL_USER || '(not configured)';
  const pool = getDbPool();

  if (pool && isDbConnected) {
    try {
      const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM \`Request_Quote\`');
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
      ? \`Database configured for \${user}@\${host}/\${database} targeting table Request_Quote. In cloud preview, local MySQL is not reachable; quotes are preserved in resilient memory and will automatically sync to Request_Quote when deployed to cPanel.\`
      : 'cPanel MySQL credentials are not set in .env. Add DB_HOST, DB_USER, DB_PASSWORD, DB_NAME to connect.'
  });
});`;

code = code.replace(dupDbStatus, '');

// Contact endpoints
code = code.replace(
  "app.post(['/api/contact', '/api/contact-inquiry'], async (req, res) => {",
  `app.post(['/api/contact', '/api/contact-inquiry'], async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(\`contact_\${clientIp}\`, 15, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many messages sent. Please wait before submitting another inquiry.' });
  }`
);
code = code.replace(
  "app.get(['/api/contact', '/api/contact-inquiry'], async (req, res) => {",
  "app.get(['/api/contact', '/api/contact-inquiry'], requireAdmin, async (req, res) => {"
);

// Proxy image hardening
const oldProxyImage = `// Proxy image endpoint to bypass CORS when embedding product images into PDF invoices
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
});`;

const newProxyImage = `// -------------------------------------------------------------
// SECURE IMAGE PROXY (SSRF Prevention, Host Allowlist, IP Check, Limits)
// -------------------------------------------------------------
const ALLOWED_IMAGE_HOSTS = new Set([
  'res.cloudinary.com',
  'images.unsplash.com',
  'via.placeholder.com',
  'placehold.co',
  'images.pexels.com',
  'spineldistribution.com',
  'www.spineldistribution.com'
]);

function isAllowedHost(hostname: string): boolean {
  const lower = (hostname || '').toLowerCase();
  if (ALLOWED_IMAGE_HOSTS.has(lower)) return true;
  if (lower.endsWith('.spineldistribution.com') || lower.endsWith('.cloudinary.com')) return true;
  return false;
}

function isPrivateOrReservedIP(ip: string): boolean {
  // IPv4 check
  if (ip.includes('.')) {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return true;

    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // Multicast & Reserved (224.0.0.0/4 and 240.0.0.0/4)
    if (parts[0] >= 224) return true;

    return false;
  }

  // IPv6 check
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  if (lower.startsWith('::ffff:')) {
    return isPrivateOrReservedIP(lower.substring(7));
  }

  return false;
}

let activeImageProxyCount = 0;
const MAX_CONCURRENT_IMAGE_PROXIES = 10;

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Image URL parameter is required.' });
  }

  // Concurrency control
  if (activeImageProxyCount >= MAX_CONCURRENT_IMAGE_PROXIES) {
    return res.status(503).json({ error: 'Image proxy service busy. Please try again shortly.' });
  }

  activeImageProxyCount++;
  try {
    let currentUrl = imageUrl.trim();
    let maxRedirects = 3;

    while (maxRedirects > 0) {
      maxRedirects--;
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(currentUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid image URL format.' });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are supported.' });
      }

      // Check allowlist
      if (!isAllowedHost(parsedUrl.hostname)) {
        return res.status(403).json({ error: \`Host '\${parsedUrl.hostname}' is not in the approved image allowlist.\` });
      }

      // Resolve DNS to verify against loopback, private, link-local, and reserved addresses
      let resolvedAddresses: dns.LookupAddress[] = [];
      try {
        resolvedAddresses = await dns.promises.lookup(parsedUrl.hostname, { all: true });
      } catch {
        return res.status(400).json({ error: \`Could not resolve hostname '\${parsedUrl.hostname}'.\` });
      }

      if (!resolvedAddresses.length) {
        return res.status(400).json({ error: 'No IP address resolved for host.' });
      }

      for (const addr of resolvedAddresses) {
        if (isPrivateOrReservedIP(addr.address)) {
          return res.status(403).json({ error: 'Access to private or reserved network address is forbidden.' });
        }
      }

      // Fetch with 5-second timeout and manual redirect validation
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(5000)
      });

      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return res.status(400).json({ error: 'Redirect location missing.' });
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch image from remote host.' });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        return res.status(415).json({ error: 'The requested resource is not a valid image.' });
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > 5 * 1024 * 1024) {
        return res.status(413).json({ error: 'Image exceeds maximum allowed size of 5MB.' });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(413).json({ error: 'Image exceeds maximum allowed size of 5MB.' });
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }

    return res.status(400).json({ error: 'Too many redirects encountered.' });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.message?.includes('aborted')) {
      return res.status(504).json({ error: 'Image request timed out after 5 seconds.' });
    }
    return res.status(500).json({ error: 'An unexpected error occurred proxying image.' });
  } finally {
    activeImageProxyCount--;
  }
});`;

code = code.replace(oldProxyImage, newProxyImage);

// 11. Remove /api/system/restart route
const oldRestartBlock = `  // Dedicated instant restart endpoint
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

    if (!viteMounted) {
      setTimeout(() => {
        console.log('[System] Manual restart triggered via /api/system/restart. Reloading Passenger process...');
        process.exit(0);
      }, 200);
    }
  });`;

code = code.replace(oldRestartBlock, '');

// 12. Clean Global Error Handler
const oldErrorHandler = `// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) });
  }
});`;

const newErrorHandler = `// Global API error handler (Does not expose internal exceptions or database details)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});`;

code = code.replace(oldErrorHandler, newErrorHandler);

fs.writeFileSync(serverPath, code, 'utf8');
console.log('Successfully updated server.ts with all security hardenings!');
