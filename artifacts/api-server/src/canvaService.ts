import crypto from 'crypto';

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';
const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

interface PendingAuth {
  codeVerifier: string;
  userId: string;
  createdAt: number;
}

interface UserTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const pendingAuth: Map<string, PendingAuth> = new Map();
const userTokens: Map<string, UserTokens> = new Map();

function cleanExpiredPendingAuth() {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const entries = Array.from(pendingAuth.entries());
  for (const [state, data] of entries) {
    if (data.createdAt < fiveMinAgo) {
      pendingAuth.delete(state);
    }
  }
}

export class CanvaService {
  static isConfigured(): boolean {
    return !!(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
  }

  static getAuthorizationUrl(userId: string, redirectUri: string): { url: string; state: string } {
    if (!this.isConfigured()) {
      throw new Error('Canva API not configured');
    }

    cleanExpiredPendingAuth();

    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const state = crypto.randomBytes(32).toString('base64url');

    pendingAuth.set(state, { codeVerifier, userId, createdAt: Date.now() });

    const authUrl = new URL(CANVA_AUTH_URL);
    authUrl.searchParams.append('client_id', process.env.CANVA_CLIENT_ID!);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'design:read design:write asset:read asset:write');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);

    return { url: authUrl.toString(), state };
  }

  static async exchangeCodeForToken(code: string, state: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    userId: string;
  }> {
    const pending = pendingAuth.get(state);
    if (!pending) {
      throw new Error('Invalid or expired auth state');
    }

    if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
      pendingAuth.delete(state);
      throw new Error('Auth state expired');
    }

    const response = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
        ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: pending.codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      pendingAuth.delete(state);
      throw new Error(`Canva token exchange failed: ${error}`);
    }

    const data = await response.json() as any;
    const userId = pending.userId;
    pendingAuth.delete(state);

    userTokens.set(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      userId,
    };
  }

  static async getAccessTokenForUser(userId: string): Promise<string | null> {
    const tokens = userTokens.get(userId);
    if (!tokens) return null;

    if (Date.now() >= tokens.expiresAt) {
      try {
        const refreshed = await this.refreshAccessToken(tokens.refreshToken);
        userTokens.set(userId, {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: Date.now() + (refreshed.expiresIn * 1000) - 60000,
        });
        return refreshed.accessToken;
      } catch {
        userTokens.delete(userId);
        return null;
      }
    }

    return tokens.accessToken;
  }

  static isUserConnected(userId: string): boolean {
    return userTokens.has(userId);
  }

  static disconnectUser(userId: string): void {
    userTokens.delete(userId);
  }

  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
        ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Canva access token');
    }

    const data = await response.json() as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  static async createDesign(accessToken: string, options: {
    designType?: string;
    title?: string;
    width?: number;
    height?: number;
  }): Promise<{ designId: string; editUrl: string }> {
    const body: any = {
      design_type: options.designType || 'custom',
      title: options.title || 'Event Invitation',
    };

    if (options.width && options.height) {
      body.width = options.width;
      body.height = options.height;
    }

    const response = await fetch(`${CANVA_API_BASE}/designs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Canva design: ${error}`);
    }

    const data = await response.json() as any;
    return {
      designId: data.design?.id,
      editUrl: data.design?.urls?.edit_url,
    };
  }

  static async getDesign(accessToken: string, designId: string): Promise<any> {
    const response = await fetch(`${CANVA_API_BASE}/designs/${designId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get Canva design');
    }

    return await response.json();
  }

  static async exportDesign(accessToken: string, designId: string, format: string = 'png'): Promise<{
    jobId: string;
    status: string;
  }> {
    const response = await fetch(`${CANVA_API_BASE}/exports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_id: designId,
        format: { type: format },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to export Canva design');
    }

    const data = await response.json() as any;
    return {
      jobId: data.job?.id,
      status: data.job?.status,
    };
  }

  static async getExportStatus(accessToken: string, jobId: string): Promise<{
    status: string;
    urls?: string[];
  }> {
    const response = await fetch(`${CANVA_API_BASE}/exports/${jobId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to check export status');
    }

    const data = await response.json() as any;
    return {
      status: data.job?.status,
      urls: data.job?.urls?.map((u: any) => u.url),
    };
  }
}
