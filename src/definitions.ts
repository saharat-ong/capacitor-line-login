export interface LineLoginSetupOptions {
  /** Public LINE Login channel ID (never the channel secret). */
  channelId: string;
}

export interface LineLoginOptions {
  /**
   * Opaque nonce from your backend. Passed through to the LINE SDK so the
   * ID token carries it — verify the same nonce server-side.
   */
  nonce: string;
  /** Default: `['profile', 'openid', 'email']`. */
  scopes?: string[];
}

export interface LineLoginResult {
  idToken: string;
  accessToken: string;
}

export interface LineLoginPlugin {
  /**
   * Initialize the LINE SDK with the public channel ID.
   * Call once before `login()`. Channel ID should come from your backend.
   */
  setup(options: LineLoginSetupOptions): Promise<void>;

  /**
   * Start LINE Login (app-to-app when the LINE app is installed; otherwise
   * the SDK falls back to its web login). Resolves with tokens for your
   * backend — never log them.
   *
   * Rejects with codes: `CANCELLED`, `NOT_SETUP`, `LOGIN_FAILED`.
   */
  login(options: LineLoginOptions): Promise<LineLoginResult>;

  /**
   * Whether the native plugin is present and `setup()` has completed.
   */
  isAvailable(): Promise<{ available: boolean }>;
}
