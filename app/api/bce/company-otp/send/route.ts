import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  BceOtpChallengeError,
  createBceOtpChallenge,
  removeBceOtpChallenge,
} from '@/lib/bce-company-otp-supabase';
import {
  BceRegistrationLookupError,
  lookupBceRegistrationCompany,
} from '@/lib/bce-registration-r2';
import { sendSmtpMail } from '@/lib/smtp-mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SendOtpBody = {
  companyNumber?: string;
  entityNumber?: string;
  contactId?: string;
};

function isRegistrationEnabled() {
  return process.env.ENABLE_REAL_COMPANY_REGISTRATION === 'true';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isSafeEmail(value: string) {
  return (
    !/[\r\n]/.test(value) &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
  );
}

function getEmailHtml(input: {
  code: string;
  entityName: string;
  expiresInMinutes: number;
}) {
  return `
    <div style="margin:0;padding:32px;background:#f4f9ff;font-family:Arial,sans-serif;color:#172033">
      <div style="max-width:560px;margin:0 auto;border:1px solid #dbeafe;border-radius:24px;background:#ffffff;overflow:hidden">
        <div style="padding:28px;background:linear-gradient(135deg,#dff4ff,#f1ebff)">
          <div style="font-size:13px;font-weight:800;letter-spacing:2px;color:#0369a1">SENDIO</div>
          <h1 style="margin:10px 0 0;font-size:25px;line-height:1.25">Votre code de vérification</h1>
        </div>
        <div style="padding:28px">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6">Une demande d’inscription a été lancée pour <strong>${escapeHtml(input.entityName)}</strong>.</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Saisissez ce code dans Sendio pour confirmer que vous avez accès à l’adresse e-mail officielle enregistrée auprès de la BCE.</p>
          <div style="margin:22px 0;padding:20px;border-radius:18px;background:#eef8ff;text-align:center;font-size:34px;font-weight:900;letter-spacing:9px;color:#075985">${input.code}</div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">Ce code expire dans ${input.expiresInMinutes} minutes. Ne le partagez avec personne.</p>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b">Vous n’avez pas demandé cette inscription ? Ignorez simplement ce message.</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  if (!isRegistrationEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'COMPANY_REGISTRATION_DISABLED',
        message: 'Real company registration is not enabled yet.',
      },
      { status: 503 },
    );
  }

  let body: SendOtpBody;

  try {
    body = (await request.json()) as SendOtpBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_REQUEST',
        message: 'The verification request is invalid.',
      },
      { status: 400 },
    );
  }

  const companyNumber = body.companyNumber?.trim() || '';
  const entityNumber = body.entityNumber?.trim() || '';
  const contactId = body.contactId?.trim() || '';

  if (!companyNumber || !entityNumber || !contactId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MISSING_FIELDS',
        message: 'Choose an official verification method first.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await lookupBceRegistrationCompany(companyNumber);
    const entity = result.company.entities.find(
      (candidate) => candidate.number === entityNumber,
    );
    const contact = result.privateContacts.find(
      (candidate) =>
        candidate.id === contactId &&
        candidate.sourceEntityNumber === entityNumber,
    );

    if (!entity || !contact || !contact.selectable) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CONTACT_NOT_AVAILABLE',
          message:
            'The selected official contact is no longer available. Reload the BCE data.',
        },
        { status: 400 },
      );
    }

    if (contact.type !== 'email') {
      return NextResponse.json(
        {
          ok: false,
          error: 'SMS_NOT_AVAILABLE',
          message:
            'SMS verification is not enabled yet. Choose the official email address.',
        },
        { status: 400 },
      );
    }

    if (!isSafeEmail(contact.value)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_OFFICIAL_EMAIL',
          message: 'The official BCE email address is invalid.',
        },
        { status: 400 },
      );
    }

    const challenge = await createBceOtpChallenge({
      companyNumber: result.company.number,
      entityNumber: entity.number,
      contactId: contact.id,
      maskedDestination: contact.maskedValue,
    });

    try {
      await sendSmtpMail({
        to: contact.value,
        subject: `Votre code de vérification Sendio : ${challenge.code}`,
        text: [
          `Votre code de vérification Sendio est ${challenge.code}.`,
          `Entreprise : ${entity.name}`,
          'Ce code expire dans 10 minutes.',
          'Ne partagez ce code avec personne.',
        ].join('\n'),
        html: getEmailHtml({
          code: challenge.code,
          entityName: entity.name,
          expiresInMinutes: 10,
        }),
      });
    } catch (error) {
      await removeBceOtpChallenge(challenge.id);
      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        challengeId: challenge.id,
        expiresInSeconds: challenge.expiresInSeconds,
        maskedDestination: contact.maskedValue,
        message: `A 6-digit verification code was sent to ${contact.maskedValue}.`,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof BceRegistrationLookupError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    if (error instanceof BceOtpChallengeError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    console.error('BCE OTP email delivery failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'OTP_DELIVERY_FAILED',
        message:
          'The verification email could not be sent. Check the Sendio SMTP settings.',
      },
      { status: 500 },
    );
  }
}
