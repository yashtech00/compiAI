import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_jwt_key_1234567890_min_32_chars',
  cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret_key_1234567890',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  geminiTimeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '2500', 10),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  isProduction: process.env.NODE_ENV === 'production'
};
