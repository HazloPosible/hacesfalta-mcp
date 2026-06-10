const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface TokenResponse {
  accessToken: string;
  expiresAtUtc: string;
  tokenType: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAccessToken(
  apiUrl: string,
  apiKey: string
): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken;
  }

  const res = await fetch(`${apiUrl}/api/v1/auth/token`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  }

  const data: TokenResponse = await res.json();
  cachedToken = data.accessToken;
  tokenExpiresAt = new Date(data.expiresAtUtc).getTime();

  return cachedToken;
}
