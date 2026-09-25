import { describe, expect, it, vi } from "vitest";
import { openReplyActivity, upsertChatMessage, wasMessageReadByPeer } from "./DirectMessageDrawer.js";

describe("upsertChatMessage", () => {
  it("reconciles the API response and realtime echo as one stable message", () => {
    const original = { id: "message-1", conversationId: "conversation-1", senderId: "user-1", content: "Hello", createdAt: "2026-09-25T10:00:00Z" };
    const realtimeEcho = { ...original, senderName: "Sara" };
    const afterResponse = upsertChatMessage([], original);
    const afterEcho = upsertChatMessage(afterResponse, realtimeEcho);
    expect(afterEcho).toHaveLength(1);
    expect(afterEcho[0]).toMatchObject({ id: "message-1", content: "Hello", senderName: "Sara" });
  });
});

describe("wasMessageReadByPeer", () => {
  it("keeps sent messages at one check until the peer read cursor passes them", () => {
    const sentAt = "2026-09-25T10:00:00.000Z";
    expect(wasMessageReadByPeer(null, sentAt)).toBe(false);
    expect(wasMessageReadByPeer("2026-09-25T09:59:59.000Z", sentAt)).toBe(false);
    expect(wasMessageReadByPeer("2026-09-25T10:00:01.000Z", sentAt)).toBe(true);
  });
});

describe("openReplyActivity", () => {
  it("marks the activity read and opens its exact post, parent, and reply", () => {
    const markRead = vi.fn().mockResolvedValue({ success: true });
    const close = vi.fn();
    const openThread = vi.fn();

    openReplyActivity(
      { id: "notification-1", entityId: "post-1", commentId: "comment-1", replyId: "reply-1" },
      { markRead, close, openThread }
    );

    expect(markRead).toHaveBeenCalledWith("notification-1");
    expect(close).toHaveBeenCalledOnce();
    expect(openThread).toHaveBeenCalledWith("post-1", "comment-1", "reply-1");
  });

  it("does nothing when the activity lacks a reply target", () => {
    const actions = { markRead: vi.fn(), close: vi.fn(), openThread: vi.fn() };
    openReplyActivity({ id: "notification-1", entityId: "post-1" }, actions);
    expect(actions.markRead).not.toHaveBeenCalled();
    expect(actions.close).not.toHaveBeenCalled();
    expect(actions.openThread).not.toHaveBeenCalled();
  });
});
