import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  /**
   * Mock: en desarrollo solo hace console.log del link.
   * En producción inyectar cliente SMTP/SendGrid y enviar email real.
   */
  async sendPasswordReset(email: string, link: string): Promise<void> {
    console.log('[MailService mock] Password reset requested:', { email, link });
  }
}
