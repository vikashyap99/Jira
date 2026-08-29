const nodemailer = require('nodemailer');
const env = require('../../config/env');

let transporter = null;
let transportError = null;

function buildTransport() {
  if (!env.email.enabled) return null;

  try {
    switch (env.email.provider) {
      case 'sendgrid': {
        transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: { user: 'apikey', pass: env.email.sendgrid },
        });
        break;
      }
      case 'mailgun': {
        transporter = nodemailer.createTransport({
          host: `smtp.mailgun.org`,
          port: 587,
          auth: {
            user: 'postmaster@' + env.email.mailgun.domain,
            pass: env.email.mailgun.apiKey,
          },
        });
        break;
      }
      case 'smtp':
      default: {
        transporter = nodemailer.createTransport({
          host: env.email.smtp.host,
          port: env.email.smtp.port,
          secure: env.email.smtp.port === 465,
          auth: env.email.smtp.user
            ? { user: env.email.smtp.user, pass: env.email.smtp.pass }
            : undefined,
        });
      }
    }
  } catch (err) {
    transportError = err;
  }

  return transporter;
}

function getTransporter() {
  if (!transporter) buildTransport();
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!env.email.enabled || !transport) {
    if (env.email.enabled) {
      console.warn('[email] sending disabled or transport failed:', transportError?.message);
    }
    return { skipped: true };
  }

  const from = env.email.smtp.from;
  return transport.sendMail({ from, to, subject, html, text });
}

module.exports = { sendMail, getTransporter };
