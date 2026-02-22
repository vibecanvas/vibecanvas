import { implement } from "@orpc/server";
import type * as _ClaudeAgentSDK from "@anthropic-ai/claude-agent-sdk";
import contract from "@vibecanvas/core-contract";
import db from "@vibecanvas/shell/database/db";
import type * as _DrizzleZod from "drizzle-zod";
import { OpencodeService } from "@vibecanvas/shell/opencode/srv.opencode";

export const baseOs = implement({ api: contract })
  .$context<{ db: typeof db, opencodeService: OpencodeService }>()

