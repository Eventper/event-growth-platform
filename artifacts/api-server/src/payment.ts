import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Flutterwave = require('flutterwave-node-v3');

let flw: any = null;

function getFlutterwaveClient() {
  if (!flw) {
    const publicKey = process.env.FLW_PUBLIC_KEY;
    const secretKey = process.env.FLW_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error('Flutterwave API keys not configured. Set FLW_PUBLIC_KEY and FLW_SECRET_KEY.');
    }

    flw = new Flutterwave(publicKey, secretKey);
  }
  return flw;
}

function generateTxRef(): string {
  return `EP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export class PaymentService {
  static isConfigured(): boolean {
    return !!(process.env.FLW_PUBLIC_KEY && process.env.FLW_SECRET_KEY);
  }

  static async initializePayment(options: {
    amount: number;
    currency: string;
    email: string;
    name: string;
    phone?: string;
    redirectUrl: string;
    title?: string;
    description?: string;
    meta?: Record<string, any>;
  }): Promise<{ link: string; txRef: string }> {
    const txRef = generateTxRef();
    const payload = {
      tx_ref: txRef,
      amount: options.amount.toString(),
      currency: options.currency.toUpperCase(),
      redirect_url: options.redirectUrl,
      payment_options: 'card,banktransfer,ussd,mobilemoney',
      customer: {
        email: options.email,
        phonenumber: options.phone || '',
        name: options.name,
      },
      customizations: {
        title: options.title || 'Event Perfekt Payment',
        description: options.description || 'Payment for event services',
        logo: 'https://eventperfekt.com/logo.png',
      },
      meta: options.meta || {},
    };

    const secretKey = process.env.FLW_SECRET_KEY;
    const apiRes = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const response = (await apiRes.json()) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };

    if (response?.status === 'success' && response?.data?.link) {
      return { link: response.data.link, txRef };
    }

    throw new Error(response?.message || 'Failed to initialize payment');
  }

  static async verifyTransaction(transactionId: string): Promise<{
    success: boolean;
    amount: number;
    currency: string;
    txRef: string;
    customerEmail: string;
    status: string;
    paymentType: string;
    data?: any;
  }> {
    const flw = getFlutterwaveClient();
    const response = await flw.Transaction.verify({ id: transactionId });

    if (response?.data) {
      return {
        success: response.data.status === 'successful',
        amount: response.data.amount,
        currency: response.data.currency,
        txRef: response.data.tx_ref,
        customerEmail: response.data.customer?.email || '',
        status: response.data.status,
        paymentType: response.data.payment_type || 'unknown',
        data: response.data,
      };
    }

    return {
      success: false,
      amount: 0,
      currency: '',
      txRef: '',
      customerEmail: '',
      status: 'failed',
      paymentType: 'unknown',
    };
  }

  static async refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean; refundId?: string }> {
    try {
      const flw = getFlutterwaveClient();
      const payload: any = {};
      if (amount) {
        payload.amount = amount;
      }
      const response = await flw.Transaction.refund({ id: transactionId, ...payload });

      return {
        success: response?.status === 'success',
        refundId: response?.data?.id?.toString(),
      };
    } catch (error) {
      console.error('Refund error:', error);
      return { success: false };
    }
  }

  static async listTransactions(options?: {
    from?: string;
    to?: string;
    currency?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      const flw = getFlutterwaveClient();
      const response = await flw.Transaction.fetch(options || {});
      return response?.data || [];
    } catch (error) {
      console.error('List transactions error:', error);
      return [];
    }
  }

  static async createPaymentPlan(options: {
    name: string;
    amount: number;
    interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    currency: string;
    duration?: number;
  }): Promise<{ planId: string; name: string }> {
    const flw = getFlutterwaveClient();
    const response = await flw.PaymentPlan.create({
      name: options.name,
      amount: options.amount,
      interval: options.interval,
      currency: options.currency.toUpperCase(),
      duration: options.duration,
    });

    if (response?.status === 'success') {
      return {
        planId: response.data.id.toString(),
        name: response.data.name,
      };
    }
    throw new Error(response?.message || 'Failed to create payment plan');
  }

  static async getSubaccounts(): Promise<any[]> {
    try {
      const flw = getFlutterwaveClient();
      const response = await flw.Subaccount.fetch_all();
      return response?.data || [];
    } catch (error) {
      console.error('Fetch subaccounts error:', error);
      return [];
    }
  }

  static verifyWebhookSignature(signature: string): boolean {
    const secretHash = process.env.FLW_SECRET_HASH;
    if (!secretHash) return false;
    return signature === secretHash;
  }

  static getPublicKey(): string {
    return process.env.FLW_PUBLIC_KEY || '';
  }
}
