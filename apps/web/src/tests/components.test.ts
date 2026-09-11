import { describe, it, expect } from "vitest";
import { App } from "../App.js";
import { AuthModal } from "../components/AuthModal.js";
import { UserSettingsModal } from "../components/UserSettingsModal.js";
import { DirectMessageDrawer } from "../components/DirectMessageDrawer.js";
import { PostComposerModal } from "../components/PostComposerModal.js";
import { PhilosophicalFeed } from "../components/PhilosophicalFeed.js";
import { SpacesHub } from "../components/SpacesHub.js";
import { SymposiumsDirectory } from "../components/SymposiumsDirectory.js";
import { EventComposerModal } from "../components/EventComposerModal.js";
import { LeaderboardHub } from "../components/LeaderboardHub.js";
import { ConnectionRequestModal } from "../components/ConnectionRequestModal.js";
import { NotificationCenterDrawer } from "../components/NotificationCenterDrawer.js";

describe("React Components Export & Module Signature Verification", () => {
  it("should export all main application view components cleanly", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
    expect(AuthModal).toBeDefined();
    expect(UserSettingsModal).toBeDefined();
    expect(DirectMessageDrawer).toBeDefined();
    expect(PostComposerModal).toBeDefined();
    expect(PhilosophicalFeed).toBeDefined();
    expect(SpacesHub).toBeDefined();
    expect(SymposiumsDirectory).toBeDefined();
    expect(EventComposerModal).toBeDefined();
    expect(LeaderboardHub).toBeDefined();
    expect(ConnectionRequestModal).toBeDefined();
    expect(NotificationCenterDrawer).toBeDefined();
  });
});
