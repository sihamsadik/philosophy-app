import { describe, expect, it, vi } from "vitest";
import { openReplyActivity } from "./DirectMessageDrawer.js";

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
