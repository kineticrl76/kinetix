import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

async function extractReceiptData(imageBase64: string, mimeType: string) {
  const apiUrl = process.env.VISION_API_URL;
  const apiKey = process.env.VISION_API_KEY;
  const model = process.env.VISION_MODEL ?? 'llama-3.2-11b-vision-preview';

  if (!apiUrl || !apiKey) throw new Error('Vision API not configured');

  const res = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: `Extract all transaction data from this receipt image and return ONLY a valid JSON object with these fields:
{
  "merchant": "store or business name",
  "amount": 0.00,
  "currency": "USD",
  "date": "YYYY-MM-DD",
  "line_items": [{ "description": "", "amount": 0.00 }],
  "tax_amount": 0.00,
  "subtotal": 0.00
}
If a field cannot be determined, use null. Return only the JSON object, no explanation.`,
            },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0,
    }),
  });

  if (!res.ok) throw new Error(`Vision API error: ${res.statusText}`);
  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content ?? '';

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in vision response');
  return { parsed: JSON.parse(jsonMatch[0]), rawText };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('receipt') as File | null;
  const userId = formData.get('userId') as string | null;
  const expenseId = formData.get('expenseId') as string | null;

  if (!file || !userId) {
    return NextResponse.json({ error: 'receipt file and userId are required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const fileName = `receipt_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // Save file locally (swap for S3/R2 in production)
  const uploadDir = process.env.UPLOAD_DIR ?? './public/uploads/receipts';
  const baseUrl = process.env.UPLOAD_BASE_URL ?? '/uploads/receipts';
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  const fileUrl = `${baseUrl}/${fileName}`;

  // Run vision extraction
  let parsedData = null;
  let rawText = null;
  try {
    const result = await extractReceiptData(base64, file.type);
    parsedData = result.parsed;
    rawText = result.rawText;
  } catch (err) {
    console.error('Vision extraction failed:', err);
    // Continue without parsed data — receipt is still saved
  }

  // If no expenseId provided, try to match by amount
  let linkedExpenseId = expenseId;
  if (!linkedExpenseId && parsedData?.amount) {
    const match = await prisma.variableExpense.findFirst({
      where: {
        userId,
        amount: { gte: parsedData.amount - 0.02, lte: parsedData.amount + 0.02 },
        receipt: null,
        transaction_date: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      orderBy: { transaction_date: 'desc' },
    });
    if (match) linkedExpenseId = match.id;
  }

  let receipt = null;
  if (linkedExpenseId) {
    receipt = await prisma.receipt.upsert({
      where: { expenseId: linkedExpenseId },
      create: { expenseId: linkedExpenseId, file_url: fileUrl, file_name: fileName, mime_type: file.type, raw_text: rawText, parsed_data: parsedData },
      update: { file_url: fileUrl, file_name: fileName, raw_text: rawText, parsed_data: parsedData },
    });
  }

  return NextResponse.json({ fileUrl, parsedData, linkedExpenseId, receiptId: receipt?.id ?? null }, { status: 201 });
}
