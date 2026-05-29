import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isInternalTransfer } from '@/lib/smsParser';
import { z } from 'zod';
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const CHUNK_SIZE = 8000;   // ~2000 tokens input — safe for Groq free tier per-request limits
const PARSE_MODEL = 'llama-3.1-8b-instant'; // high TPM limit for batch parsing
const CHUNK_DELAY_MS = 5000; // wait between chunks to stay under rate limit

// Step 1: Try fast text extraction. Returns empty string for image-based PDFs.
async function extractTextLayer(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text.trim();
}

// Step 2: OCR fallback — converts PDF pages to PNG via Poppler, then runs Tesseract.
async function extractTextViaOCR(buffer: Buffer): Promise<string> {
  const { writeFile, readdir, readFile, rm, mkdtemp } = await import('fs/promises');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Poppler } = require('node-poppler');
  const { createWorker } = await import('tesseract.js');

  // Write PDF to a temp file (Poppler needs a file path)
  const tmpDir = await mkdtemp(join(tmpdir(), 'kinetix-ocr-'));
  const pdfPath = join(tmpDir, 'input.pdf');
  const outBase = join(tmpDir, 'page');

  try {
    await writeFile(pdfPath, buffer);

    // Convert each page to a PNG at 200 DPI
    const poppler = new Poppler();
    await poppler.pdfToCairo(pdfPath, outBase, {
      pngFile: true,
      resolutionXYAxis: 200,
    });

    // OCR each PNG page
    const files = (await readdir(tmpDir))
      .filter((f: string) => f.endsWith('.png'))
      .sort();

    const worker = await createWorker('eng');
    const pageTexts: string[] = [];

    for (const file of files) {
      const imgBuffer = await readFile(join(tmpDir, file));
      const { data: { text } } = await worker.recognize(imgBuffer);
      pageTexts.push(text);
    }

    await worker.terminate();
    return pageTexts.join('\n');
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// Main extraction: text layer first, OCR fallback for image-based PDFs.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const textLayer = await extractTextLayer(buffer);
  if (textLayer.length > 100) return textLayer; // has real text
  console.log('No text layer found — falling back to OCR (this may take a moment)');
  return extractTextViaOCR(buffer);
}

interface ParsedTransaction {
  date: string;
  merchant_name: string;
  amount: number;
  type: 'credit' | 'debit';
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function parseTransactionsFromText(chunk: string, currency: string, dateHint: string): Promise<ParsedTransaction[]> {
  const apiUrl = process.env.VISION_API_URL;
  const apiKey = process.env.VISION_API_KEY;
  if (!apiUrl || !apiKey) throw new Error('AI API not configured');

  const res = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: PARSE_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a financial data parser. Extract ALL bank transactions from the text and return ONLY a valid JSON array. Each element must have exactly: date (YYYY-MM-DD), merchant_name (string, max 100 chars), amount (positive number, no currency symbol), type ("credit" or "debit"). Rules: debits/withdrawals/purchases = "debit", deposits/credits/refunds = "credit". Skip header rows, opening/closing balance rows, and summary totals. IMPORTANT: ${dateHint} Any date outside this range is an OCR artifact — skip it. Return [] if genuinely no transactions exist.`,
        },
        {
          role: 'user',
          content: `Extract all transactions. Currency: ${currency}.\n\n${chunk}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0,
    }),
  });

  if (!res.ok) throw new Error(`AI API error: ${res.statusText}`);
  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content ?? '[]';
  const match = rawText.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Retry wrapper — handles Groq 429 rate limit with exponential backoff
async function parseChunkWithRetry(chunk: string, currency: string, dateHint: string): Promise<ParsedTransaction[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await parseTransactionsFromText(chunk, currency, dateHint);
    } catch (err: any) {
      if (err.message?.includes('Too Many Requests') && attempt < 3) {
        const delay = (attempt + 1) * 6000; // 6s, 12s, 18s
        console.log(`Rate limited — retrying chunk in ${delay / 1000}s (attempt ${attempt + 1}/3)`);
        await sleep(delay);
      } else {
        console.error('Chunk parse failed:', err.message);
        return [];
      }
    }
  }
  return [];
}

const QuerySchema = z.object({
  userId: z.string(),
  currency: z.string().length(3).default('USD'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('statement') as File | null;
  const userId = formData.get('userId') as string | null;
  const currency = (formData.get('currency') as string | null) ?? 'USD';
  const date_from = (formData.get('date_from') as string | null) ?? undefined;
  const date_to = (formData.get('date_to') as string | null) ?? undefined;

  const query = QuerySchema.safeParse({ userId, currency, date_from, date_to });
  if (!query.success || !file) {
    return NextResponse.json({ error: 'statement (PDF) and userId are required' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }
  if (file.size > MAX_PDF_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract text from PDF
  let rawText: string;
  try {
    rawText = await extractPdfText(buffer);
  } catch (err) {
    console.error('PDF extraction error:', err);
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 422 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'PDF appears to contain no extractable text (scanned image PDFs not supported)' }, { status: 422 });
  }

  // Split into large chunks — most 6-month statements fit in 1-2 chunks
  const chunks: string[] = [];
  for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
    chunks.push(rawText.slice(i, i + CHUNK_SIZE));
  }
  console.log(`Parsing ${chunks.length} chunk(s) from ${rawText.length} chars of extracted text`);

  // Build date hint for the LLM so it knows what dates to expect
  const dateHint = query.data.date_from && query.data.date_to
    ? `All transactions in this statement are dated between ${query.data.date_from} and ${query.data.date_to}.`
    : `All transactions are recent (within the last 2 years). Today is ${new Date().toISOString().slice(0, 10)}.`;

  // Process chunks sequentially with delay to respect rate limits
  let allTransactions: ParsedTransaction[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(CHUNK_DELAY_MS);
    const parsed = await parseChunkWithRetry(chunks[i], currency, dateHint);
    console.log(`Chunk ${i + 1}/${chunks.length}: found ${parsed.length} transactions`);
    allTransactions = allTransactions.concat(parsed);
  }

  // De-duplicate within this import batch
  const seen = new Set<string>();
  const unique = allTransactions.filter(t => {
    const key = `${t.date}|${t.merchant_name}|${t.amount}|${t.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Reject hallucinated dates — use user-supplied range with a 45-day buffer
  // If no range supplied, fall back to last 5 years
  const minDate = query.data.date_from
    ? new Date(new Date(query.data.date_from).getTime() - 45 * 86400000)
    : (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 5); return d; })();
  const maxDate = query.data.date_to
    ? new Date(new Date(query.data.date_to).getTime() + 45 * 86400000)
    : new Date();

  // Filter out internal transfers, keep only debits, validate dates
  const debits = unique
    .filter(t => !isInternalTransfer(t.merchant_name))
    .filter(t => t.type === 'debit')
    .filter(t => {
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d >= minDate && d <= maxDate;
    });

  if (debits.length === 0) {
    return NextResponse.json({ imported: 0, skipped: unique.length, message: 'No qualifying debit transactions found' });
  }

  // Deduplication against existing DB records — safe to re-upload the same file
  const existingKeys = new Set(
    (await prisma.variableExpense.findMany({
      where: {
        userId: query.data.userId,
        source: 'receipt_scan',
        transaction_date: {
          gte: new Date(debits.reduce((min, t) => t.date < min ? t.date : min, debits[0].date)),
          lte: new Date(debits.reduce((max, t) => t.date > max ? t.date : max, debits[0].date)),
        },
      },
      select: { merchant: true, amount: true, transaction_date: true },
    })).map(e => `${e.transaction_date.toISOString().slice(0, 10)}|${e.merchant}|${e.amount}`)
  );

  const newDebits = debits.filter(t => !existingKeys.has(`${t.date}|${t.merchant_name}|${t.amount}`));
  const duplicatesSkipped = debits.length - newDebits.length;

  if (newDebits.length > 0) {
    await prisma.variableExpense.createMany({
      data: newDebits.map(t => ({
        userId: query.data.userId,
        merchant: t.merchant_name,
        category: 'general',
        amount: t.amount,
        local_currency: currency,
        exchange_rate_to_base: 1.0,
        is_tax_deductible: false,
        transaction_date: new Date(t.date),
        source: 'receipt_scan',
        notes: 'Imported from bank statement PDF',
      })),
    });
  }

  return NextResponse.json({
    imported: newDebits.length,
    duplicates_skipped: duplicatesSkipped,
    skipped_credits: unique.length - debits.length,
    total_parsed: allTransactions.length,
  });
}
