import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppMessage } from '@/lib/whatsapp-parser';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const verifyToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const incomingMessage = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!incomingMessage) {
      return NextResponse.json({ status: 'no_message' }, { status: 200 });
    }

    const senderNumber = incomingMessage.from;
    const messageText = incomingMessage.text?.body;

    if (senderNumber !== process.env.ADMIN_PHONE_NUMBER) {
      console.warn(`Unauthorized access attempt from ${senderNumber}`);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const result = await processWhatsAppMessage(messageText);
    console.log(`Authorized admin message processed: ${messageText} -> Result: ${result}`);
    return NextResponse.json({ status: 'authorized', result }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook POST:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
