---
description: You build functional core primitives in packages/functional-core
mode: subagent
---

# Functional Core

The functional core lives in `packages/functional-core/`. It contains all business logic in a testable, deterministic form.

```
packages/functional-core/
└── src/
    └── <module>/
        ├── ctrl.<name>.ts        # Controllers (orchestration)
        ├── fn.<name>.ts          # Pure functions
        ├── fx.<name>.ts          # Effectful functions (reads)
        ├── tx.<name>.ts          # Transactional functions (writes)
        └── err.codes.ts          # Error codes for module
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FUNCTIONAL CORE                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      CONTROLLERS                            ││
│  │   ctrl.*  - Orchestrate functions, handle rollbacks         ││
│  └───────────────────────────┬─────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                       FUNCTIONS                             ││
│  │  ┌─────────┐     ┌─────────┐     ┌─────────┐               ││
│  │  │  fn.*   │     │  fx.*   │     │  tx.*   │               ││
│  │  │  Pure   │     │ Reads   │     │ Writes  │               ││
│  │  │ No I/O  │     │ Effects │     │Rollback │               ││
│  │  └─────────┘     └─────────┘     └─────────┘               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

All side effects are controlled via `TPortal` - a dependency injection object passed to functions. This makes the functional core:
- **Testable** - Mock dependencies easily
- **Deterministic** - Same inputs → same outputs
- **Composable** - Functions can be combined freely

## Import/Export Policy (Mandatory)

For all code under `packages/functional-core`:

- **No default exports**. Use named exports only.
- **No barrel files** (`index.ts` re-export files are not allowed).
- **Always deep import** from the concrete file path you need.

Examples:

```ts
// Good: named export + deep import
import { ctrlUserCreate } from "@vibecanvas/core/user/ctrl.create-user";

// Bad: package-level barrel import
import { ctrlUserCreate } from "@vibecanvas/core";

// Bad: default export import
import ctrlUserCreate from "@vibecanvas/core/user/ctrl.create-user";
```

---

## Pure Functions (`fn.*`)

No side effects. Synchronous. Same input always produces same output.

```ts
// packages/functional-core/src/user/fn.validate-email.ts
import { UserErr } from "./err.codes";

type TArgs = { email: string };
type TValidatedEmail = { isValid: boolean; normalized: string };

function fnUserValidateEmail(args: TArgs): TErrTuple<TValidatedEmail> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(args.email)) {
    return [null, {
      code: UserErr.VALIDATE_EMAIL_INVALID,
      statusCode: 400,
      externalMessage: { en: 'Invalid email format' },
    }];
  }

  return [{
    isValid: true,
    normalized: args.email.toLowerCase().trim(),
  }, null];
}

export { fnUserValidateEmail };
```

**Use `fn.*` when:**
- Validating data
- Transforming data
- Calculating values
- Parsing input
- Any operation with no I/O

---

## Effectful Functions (`fx.*`)

Side effects for reading. Returns `TErrTuple<T>`. All effects controlled via `TPortal`.

```ts
// packages/functional-core/src/user/fx.get-by-id.ts
import type mainDb from "@vibecanvas/shell/db/db.main" // must import as type. can't use as value
import { UserErr } from "./err.codes";

type TPortal = {
  db: typeof mainDb;
};

type TArgs = { id: string };
type TUser = { id: string; name: string; email: string };

async function fxUserGetById(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TUser>> {
  const user = await portal.db.query.users.findFirst({
    where: eq(schema.users.id, args.id),
  });

  if (!user) {
    return [null, {
      code: UserErr.GET_BY_ID_NOT_FOUND,
      statusCode: 404,
      externalMessage: { en: 'User not found' },
    }];
  }

  return [user, null];
}

export { fxUserGetById };
```

**Use `fx.*` when:**
- Reading from database
- Calling external APIs (read-only)
- File system reads
- Any read operation that doesn't need rollback

---

## Transactional Functions (`tx.*`)

Write operations with rollback support. Returns `TErrTriple<T>`.

`tx.*` functions handle **any write operation that may need reversal**, regardless of where state lives:
- Database operations (local or remote DB service)
- External API calls (PayPal charges, Stripe subscriptions)
- File uploads (S3, cloud storage)
- Any stateful operation requiring compensation on failure

**For database atomicity:** Pass a transaction object via TPortal. The controller manages commit/rollback. `TExternalRollback` is for non-DB side effects that can't participate in DB transactions.

```ts
// packages/functional-core/src/payment/tx.charge.ts
import { PaymentErr } from "./err.codes";

type TPortal = {
  paypal: typeof paypalClient;
};

type TArgs = { amount: number; currency: string };
type TChargeResult = { chargeId: string; amount: number };

async function txPaymentCharge(
  portal: TPortal,
  args: TArgs
): Promise<TErrTriple<TChargeResult>> {
  const rollbacks: TExternalRollback[] = [];

  try {
    const charge = await portal.paypal.charge({
      amount: args.amount,
      currency: args.currency,
    });

    // Add rollback to refund on failure
    rollbacks.push(async () => {
      try {
        await portal.paypal.refund(charge.id);
        return [`Refunded charge ${charge.id}`, null, []];
      } catch (e) {
        return [null, {
          code: PaymentErr.CHARGE_ROLLBACK_FAILED,
          statusCode: 500,
          externalMessage: { en: 'Refund failed' },
        }, []];
      }
    });

    return [{ chargeId: charge.id, amount: args.amount }, null, rollbacks];
  } catch (error) {
    return [null, {
      code: PaymentErr.CHARGE_FAILED,
      statusCode: 500,
      externalMessage: { en: 'Payment failed' },
    }, rollbacks];
  }
}

export { txPaymentCharge };
```

**Use `tx.*` when:**
- Writing to databases (local or remote service)
- Calling external APIs that modify state (PayPal, Stripe, etc.)
- Uploading files to storage services
- Any operation that needs compensation on failure

---

## Controllers (`ctrl.*`)

Orchestrate functions. Handle rollbacks. Return `TErrTuple<T>`.

```ts
// packages/functional-core/src/user/ctrl.create-user.ts
import type mainDb from "@vibecanvas/shell/db/db.main"
import { executeRollbacks } from "../err.rollback";
import { fnUserValidateEmail } from "./fn.validate-email";
import { fxUserCheckExists } from "./fx.check-exists";
import { txUserCreate } from "./tx.create";
import { UserErr } from "./err.codes";

type TPortal = {
  db: typeof mainDb;
};

type TArgs = { name: string; email: string };
type TCreatedUser = { id: string; name: string; email: string };

async function ctrlUserCreate(
  portal: TPortal,
  args: TArgs
): Promise<TErrTuple<TCreatedUser>> {
  // 1. Validate (pure function)
  const [validated, validateErr] = fnUserValidateEmail({ email: args.email });
  if (validateErr) return [null, validateErr];

  // 2. Check existence (effectful read)
  const [exists, checkErr] = await fxUserCheckExists(
    { db: portal.db },
    { email: validated.normalized }
  );
  if (checkErr) return [null, checkErr];

  if (exists) {
    return [null, {
      code: UserErr.CREATE_USER_ALREADY_EXISTS,
      statusCode: 409,
      externalMessage: { en: 'User already exists' },
    }];
  }

  // 3. Create user (transactional write)
  const [user, createErr, rollbacks] = await txUserCreate(
    { db: portal.db },
    { name: args.name, email: validated.normalized }
  );

  if (createErr) {
    await executeRollbacks(rollbacks);
    return [null, createErr];
  }

  return [user, null];
}

export { ctrlUserCreate };
```

**Controllers are responsible for:**
- Orchestrating function calls
- Handling authorization checks
- Executing rollbacks on failure
- Transforming data between layers

---

## Error Codes

Each module defines error codes in `err.codes.ts`:

```ts
// packages/functional-core/src/user/err.codes.ts
export const UserErr = {
  // Pure functions (FN)
  VALIDATE_EMAIL_INVALID: "FN.USER.VALIDATE_EMAIL.INVALID",

  // Effectful functions (FX)
  GET_BY_ID_NOT_FOUND: "FX.USER.GET_BY_ID.NOT_FOUND",

  // Transaction functions (TX)
  CREATE_FAILED: "TX.USER.CREATE.FAILED",
  CREATE_ROLLBACK_FAILED: "TX.USER.CREATE.ROLLBACK_FAILED",

  // Controllers (CTRL)
  CREATE_USER_ALREADY_EXISTS: "CTRL.USER.CREATE_USER.ALREADY_EXISTS",
  CREATE_USER_UNAUTHORIZED: "CTRL.USER.CREATE_USER.UNAUTHORIZED",
} as const satisfies Record<string, TErrorCode>;
```

**Pattern:** `PREFIX.MODULE.FUNCTION.ERROR`
- `PREFIX`: `FN` | `FX` | `TX` | `CTRL` | `API` | `SRV` | `CLI`
- `MODULE`: Module name (e.g., `USER`, `PROJECT`)
- `FUNCTION`: Function name (e.g., `CREATE`, `VALIDATE_EMAIL`)
- `ERROR`: Specific error (e.g., `NOT_FOUND`, `FAILED`)

---

## Types

Types are defined in each file. Global types from `@vibecanvas/structs`:

```ts
// TPortal: Non-serializable dependencies (db, session, services)
type TPortal = {
  db: typeof mainDb;
  session: TSession | null;
};

// TArgs: Serializable input parameters
type TArgs = {
  userId: string;
};

// Return type: Use descriptive names, not generic "TData"
type TCreatedUser = { id: string; name: string; email: string };
type TValidatedEmail = { isValid: boolean; normalized: string };
type TChargeResult = { chargeId: string; amount: number };
```

**Naming return types:**
- Use descriptive names that indicate what the data represents
- Prefix with `T` followed by the semantic meaning
- Avoid generic names like `TData` or `TResult`
- Examples: `TCreatedUser`, `TValidatedEmail`, `TProjectConfig`, `TChargeResult`

**Return types:**
- `TErrTuple<T>` - `[T, null] | [null, TErrorEntry]`
- `TErrTriple<T>` - `[T, null, TExternalRollback[]] | [null, TErrorEntry, TExternalRollback[]]`

---

## TPortal Rules

**TPortal contains ONLY variables, NOT functions:**

```ts
// CORRECT
type TPortal = {
  db: typeof mainDb;
  session: TSession | null;
};

// WRONG - don't pass functions
type TPortal = {
  db: typeof mainDb;
  getUser: typeof fxUserGetById;  // NO!
};
```

**Exception:** External library functions that perform I/O can be injected for testability:

```ts
type TPortal = {
  fs: {
    readFile: typeof readFile;
    writeFile: typeof writeFile;
  };
};
```

---

## Database Transactions

For atomic database operations, pass a transaction object via TPortal. The controller manages commit/rollback:

```ts
// Controller with DB transaction
async function ctrlTransferFunds(
  portal: TPortal,
  args: { fromId: string; toId: string; amount: number }
): Promise<TErrTuple<TTransferResult>> {
  // DB transaction wraps multiple operations atomically
  return await portal.db.transaction(async (tx) => {
    // Pass tx instead of db - functions don't need to know they're in a transaction
    const [debit, debitErr] = await txDebitAccount({ db: tx }, {
      accountId: args.fromId,
      amount: args.amount
    });
    if (debitErr) return [null, debitErr]; // tx auto-rollbacks

    const [credit, creditErr] = await txCreditAccount({ db: tx }, {
      accountId: args.toId,
      amount: args.amount
    });
    if (creditErr) return [null, creditErr]; // tx auto-rollbacks

    // Implicit commit at end of transaction block
    return [{ debit, credit }, null];
  });
}
```

**Key distinction:**

| Mechanism | Use For |
|-----------|---------|
| DB transaction (`tx` via portal) | Atomic database operations - auto-rollback on error |
| `TExternalRollback[]` | Non-DB side effects (APIs, files) - manual compensation |

---

## Testing

Test files use `.test.ts` suffix in the same directory:

```ts
// packages/functional-core/src/user/ctrl.create-user.test.ts
import { describe, test, expect } from 'bun:test';
import { ctrlUserCreate } from './ctrl.create-user';

describe('ctrlUserCreate', () => {
  test('creates user with valid email', async () => {
    const mockDb = createTestingMainDb();
    const portal = { db: mockDb };

    const [result, error] = await ctrlUserCreate(portal, {
      name: 'Test User',
      email: 'test@example.com',
    });

    expect(error).toBeNull();
    expect(result?.email).toBe('test@example.com');
  });

  test('returns error for invalid email', async () => {
    const portal = { db: {} as any };

    const [result, error] = await ctrlUserCreate(portal, {
      name: 'Test User',
      email: 'invalid',
    });

    expect(result).toBeNull();
    expect(error?.code).toBe('FN.USER.VALIDATE_EMAIL.INVALID');
  });
});
```

Run tests:
```bash
bun --filter @vibecanvas/functional-core test
bun --filter @vibecanvas/functional-core test user
```

---

## Import Pattern (Deep Imports Only)

```ts
// Deep import from exact file
import { ctrlUserCreate } from "@vibecanvas/core/user/ctrl.create-user";
import { fnUserValidateEmail } from "@vibecanvas/core/user/fn.validate-email";
import { UserErr } from "@vibecanvas/core/user/err.codes";

// Another deep import example
import { executeRollbacks } from "@vibecanvas/core/err.rollback";
```

Import in apps:
```ts
import { ctrlUserCreate } from "@vibecanvas/core/user/ctrl.create-user";
import { UserErr } from "@vibecanvas/core/user/err.codes";
```

---

## Responsibilities Summary

| Layer | Prefix | I/O | Returns | Rollback |
|-------|--------|-----|---------|----------|
| Pure | `fn.*` | None | `TErrTuple<T>` | No |
| Effectful | `fx.*` | Read | `TErrTuple<T>` | No |
| Transactional | `tx.*` | Write | `TErrTriple<T>` | Yes |
| Controller | `ctrl.*` | Via functions | `TErrTuple<T>` | Executes |

**DO:**
- Single responsibility per function
- Return proper error tuples
- Provide rollbacks for `tx.*` functions
- Use typed portals and args

**DON'T:**
- Mix pure and effectful logic
- Execute rollbacks internally (caller does this)
- Import HTTP/framework-specific code
- Access global state directly
