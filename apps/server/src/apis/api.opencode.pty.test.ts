import { describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import { buildPtyConnectUrl, requireChatContext } from "./api.opencode";

describe("api.opencode pty helpers", () => {
  test("buildPtyConnectUrl includes encoded pty id and cursor", () => {
    const url = buildPtyConnectUrl({
      opencodeService: {
        opencodeServer: { url: "http://127.0.0.1:4096" },
      } as any,
      ptyID: "pty/abc",
      cursor: "42",
      directory: "/tmp/project",
    });

    expect(url).toBe("http://127.0.0.1:4096/pty/pty%2Fabc/connect?directory=%2Ftmp%2Fproject&cursor=42");
  });

  test("requireChatContext throws when chat is missing", () => {
    const dbClient = {
      query: {
        chats: {
          findFirst: () => ({
            sync: () => null,
          }),
        },
      },
    } as any;

    const opencodeService = {
      getClient: () => ({}) as any,
    } as any;

    expect(() => requireChatContext(dbClient, opencodeService, "chat-1")).toThrow(ORPCError);
  });

  test("requireChatContext returns chat and client", () => {
    const expectedChat = { id: "chat-1", local_path: "/tmp/project" };
    const expectedClient = { pty: {} };

    const dbClient = {
      query: {
        chats: {
          findFirst: () => ({
            sync: () => expectedChat,
          }),
        },
      },
    } as any;

    const opencodeService = {
      getClient: () => expectedClient,
    } as any;

    const context = requireChatContext(dbClient, opencodeService, "chat-1");

    expect(context.chat).toBe(expectedChat);
    expect(context.client).toBe(expectedClient as any);
  });
});
