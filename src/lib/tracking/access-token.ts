type AccessTokenProvider = (forceRefresh: boolean) => Promise<string | null>;

let accessTokenProvider: AccessTokenProvider | null = null;

export function setTrackingAccessTokenProvider(
  provider: AccessTokenProvider | null,
) {
  accessTokenProvider = provider;
}

export async function getTrackingAccessToken(): Promise<string> {
  const provider = accessTokenProvider;
  if (!provider) {
    throw new Error("Sign in with Google before using video tracking.");
  }

  const token = (await provider(false)) ?? (await provider(true));
  if (!token) {
    throw new Error("Sign in with Google before using video tracking.");
  }
  return token;
}
