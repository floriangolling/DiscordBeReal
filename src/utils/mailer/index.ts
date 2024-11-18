import nodemailer, {
  SendMailOptions,
  SentMessageInfo,
  Transporter,
} from 'nodemailer';

import { readFileSync } from 'fs';

import Logger from '@/lib/logger';
import env from '@/env';
import path from 'path';

const transporter: Transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 1,
  service: env.BOT_MAILER_SERVICE,
  auth: {
    user: env.BOT_MAILER,
    pass: env.BOT_MAILER_PASSWORD,
  },
});

interface MailOptions extends SendMailOptions{
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * @param to
 * @param verificationCode
 * @param user
 * @description
 * This function is responsible for sending the verification email to the user
 * @returns
 * Error | null
 */
const sendVerificationEmail = async (
  to: string,
  verificationCode: number,
  user: string,
): Promise<Error | null> => {
  let index = readFileSync(path.join(__dirname, '../ressources/index.html'), 'utf8');
  index = index.replace('{{verificationCode}}', verificationCode.toString());
  index = index.replace('{{user}}', user);

  const mailOptions: MailOptions = {
    from: env.BOT_MAILER,
    to,
    subject: 'Verification - Epitech Roles Manager',
    text: `Here is your code: ${verificationCode}\n\nIf you didn't ask for it, the request comes from the discord user ${user}`,
    html: index,
  };

  try {
    await new Promise((resolve, reject) => {
      transporter.sendMail(
        mailOptions,
        (error: Error | null, info: SentMessageInfo) => {
          if (error) {
            reject(error);
          } else {
            resolve(info);
          }
        },
      );
    });
    return null;
  } catch (error) {
    Logger.error('error', `Error while sending verification email: ${error}`);
    return error as Error;
  }
};

export default sendVerificationEmail;
