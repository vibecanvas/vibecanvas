import type {
  AccountInfo,
  Options,
  SDKUserMessage,
  query as sdkQuery,
} from "@anthropic-ai/claude-agent-sdk";

type TPortal = {
  claudeAgentSdk: {
    query: typeof sdkQuery;
  };
};

type TArgs = {
  options?: Partial<Options>;
};

type TAuthType = "subscription" | "api" | "none";

type TClaudeInstallStatus = {
  isInstalled: boolean;
  reason: string | null;
};

type TClaudeAuthStatus = {
  isAuthenticated: boolean;
  authType: TAuthType;
  email: string | null;
  organization: string | null;
  subscriptionType: string | null;
  tokenSource: string | null;
  apiKeySource: string | null;
  reason: string | null;
};

type TClaudeCheckStatus = {
  install: TClaudeInstallStatus;
  auth: TClaudeAuthStatus;
};

type TInternalClaudeCheck = {
  accountInfo: AccountInfo | null;
  errorMessage: string | null;
  isInstalled: boolean;
  isAuthError: boolean;
};

function errorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isExecutableMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("executable not found") ||
    normalized.includes("native binary not found") ||
    normalized.includes("failed to spawn claude code process") ||
    normalized.includes("enoent")
  );
}

function isAuthenticationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("not authenticated") ||
    normalized.includes("authentication") ||
    normalized.includes("please login") ||
    normalized.includes("run /login") ||
    normalized.includes("api key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  );
}

function authFromAccountInfo(accountInfo: AccountInfo): Omit<TClaudeAuthStatus, "reason"> {
  const isApiAuth = Boolean(accountInfo.apiKeySource);
  const isSubscriptionAuth = Boolean(
    accountInfo.subscriptionType || accountInfo.tokenSource || accountInfo.email
  );

  let authType: TAuthType = "none";
  if (isApiAuth) authType = "api";
  else if (isSubscriptionAuth) authType = "subscription";

  return {
    isAuthenticated: authType !== "none",
    authType,
    email: accountInfo.email ?? null,
    organization: accountInfo.organization ?? null,
    subscriptionType: accountInfo.subscriptionType ?? null,
    tokenSource: accountInfo.tokenSource ?? null,
    apiKeySource: accountInfo.apiKeySource ?? null,
  };
}

async function* emptyPromptStream(): AsyncIterable<SDKUserMessage> {
  return;
}

async function runClaudeCheck(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TInternalClaudeCheck>> {
  const query = portal.claudeAgentSdk.query({
    prompt: emptyPromptStream(),
    options: {
      includePartialMessages: false,
      ...args.options,
    },
  });

  try {
    const accountInfo = await query.accountInfo();
    return [
      {
        accountInfo,
        errorMessage: null,
        isInstalled: true,
        isAuthError: false,
      },
      null,
    ];
  } catch (error) {
    const message = errorMessageFromUnknown(error);
    const executableMissing = isExecutableMissingError(message);
    const authError = isAuthenticationError(message);

    if (executableMissing || authError) {
      return [
        {
          accountInfo: null,
          errorMessage: message,
          isInstalled: !executableMissing,
          isAuthError: authError,
        },
        null,
      ];
    }

    return [
      null,
      {
        code: "FX.CLAUDE.CHECK.FAILED",
        statusCode: 500,
        externalMessage: { en: "Failed to check Claude status" },
        internalMessage: message,
      },
    ];
  } finally {
    try {
      query.close();
    } catch {
      // Ignore close errors. They should not mask the check result.
    }
  }
}

function toInstallStatus(checkResult: TInternalClaudeCheck): TClaudeInstallStatus {
  return {
    isInstalled: checkResult.isInstalled,
    reason: checkResult.errorMessage,
  };
}

function toAuthStatus(checkResult: TInternalClaudeCheck): TErrTuple<TClaudeAuthStatus> {
  if (checkResult.accountInfo) {
    return [
      {
        ...authFromAccountInfo(checkResult.accountInfo),
        reason: null,
      },
      null,
    ];
  }

  if (!checkResult.isInstalled || checkResult.isAuthError) {
    return [
      {
        isAuthenticated: false,
        authType: "none",
        email: null,
        organization: null,
        subscriptionType: null,
        tokenSource: null,
        apiKeySource: null,
        reason: checkResult.errorMessage,
      },
      null,
    ];
  }

  return [
    null,
    {
      code: "FX.CLAUDE.CHECK.AUTH_STATUS_FAILED",
      statusCode: 500,
      externalMessage: { en: "Failed to determine Claude authentication status" },
    },
  ];
}

async function fxClaudeCheckInstalled(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TClaudeInstallStatus>> {
  const [checkResult, checkError] = await runClaudeCheck(portal, args);
  if (checkError) return [null, checkError];

  return [toInstallStatus(checkResult), null];
}

async function fxClaudeCheckAuth(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TClaudeAuthStatus>> {
  const [checkResult, checkError] = await runClaudeCheck(portal, args);
  if (checkError) return [null, checkError];

  return toAuthStatus(checkResult);
}

async function fxClaudeCheck(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TClaudeCheckStatus>> {
  const [checkResult, checkError] = await runClaudeCheck(portal, args);
  if (checkError) return [null, checkError];

  const [authStatus, authError] = toAuthStatus(checkResult);
  if (authError) return [null, authError];

  return [
    {
      install: toInstallStatus(checkResult),
      auth: authStatus,
    },
    null,
  ];
}

export default fxClaudeCheck;
export { fxClaudeCheckInstalled, fxClaudeCheckAuth };
export type {
  TPortal,
  TArgs,
  TAuthType,
  TClaudeInstallStatus,
  TClaudeAuthStatus,
  TClaudeCheckStatus,
};
