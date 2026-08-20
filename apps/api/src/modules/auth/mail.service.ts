import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, text: string): Promise<void> {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    if (!resendKey) {
      this.logger.log(`[console-mailer] to=${to} subject=${subject}\n${text}`);
      return;
    }

    const from = this.config.get<string>('EMAIL_FROM') ?? 'Genie <noreply@localhost>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend failed: ${response.status} ${body}`);
      throw new ServiceUnavailableException({
        code: 'MAIL_FAILED',
        message: 'Could not send email. Please try again later.',
      });
    }
  }
}
