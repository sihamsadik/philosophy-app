import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgoraPhilosophyClient } from "../lib/api-client.js";

describe("Image and Text Post Support", () => {
  let client: AgoraPhilosophyClient;
  let fetchSpy: any;

  beforeEach(() => {
    client = new AgoraPhilosophyClient({
      baseUrl: "https://api.example.com/v7",
      projectId: "phil-proj",
      authToken: "valid-jwt-token-with-length-greater-than-twenty",
    });
  });

  afterEach(() => {
    if (fetchSpy) fetchSpy.mockRestore();
  });

  it("1. creates a text-only post using application/json payload", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "entity-text-1",
        title: "Critique of Pure Reason",
        content: "Space and time are forms of human sensibility.",
        userId: "usr-kant",
        spaceId: "space-epistemology",
        files: [],
        metadata: {
          postType: "argument",
          primarySchool: "Idealism",
          keyThinkers: ["Immanuel Kant"],
        },
      }),
    } as any);

    const post = await client.createPost({
      title: "Critique of Pure Reason",
      content: "Space and time are forms of human sensibility.",
      postType: "argument",
      spaceId: "space-epistemology",
      primarySchool: "Idealism",
      keyThinkers: ["Immanuel Kant"],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/v7/phil-proj/entities",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );

    expect(post.id).toBe("entity-text-1");
    expect(post.title).toBe("Critique of Pure Reason");
    expect(post.content).toBe("Space and time are forms of human sensibility.");
    expect(post.imageUrl).toBeUndefined();
    expect(post.imageUrls).toBeUndefined();
  });

  it("2. creates an image-only post using multipart/form-data", async () => {
    const fakeImage = new File([new Uint8Array([1, 2, 3])], "allegory_of_cave.png", { type: "image/png" });

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "entity-img-1",
        title: "The Allegory of the Cave",
        content: "",
        userId: "usr-plato",
        files: [
          {
            id: "file-cave-1",
            originalPath: "https://storage.example.com/files/cave.png",
            type: "image",
          },
        ],
        metadata: {
          postType: "thought_experiment",
          primarySchool: "Platonism",
          keyThinkers: ["Plato"],
        },
      }),
    } as any);

    const post = await client.createPost({
      title: "The Allegory of the Cave",
      content: "",
      postType: "thought_experiment",
      image: fakeImage,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/v7/phil-proj/entities",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    expect(post.id).toBe("entity-img-1");
    expect(post.imageUrl).toBe("https://storage.example.com/files/cave.png");
    expect(post.imageUrls).toEqual(["https://storage.example.com/files/cave.png"]);
  });

  it("3. creates a combined text + image post", async () => {
    const fakeImage = new File([new Uint8Array([4, 5, 6])], "panopticon.jpg", { type: "image/jpeg" });

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "entity-combo-1",
        title: "Discipline and Punish",
        content: "Visibility is a trap in disciplinary architecture.",
        userId: "usr-foucault",
        files: [
          {
            id: "file-panopticon",
            originalPath: "https://storage.example.com/files/panopticon.jpg",
            type: "image",
          },
        ],
        metadata: {
          postType: "argument",
          primarySchool: "Post-Structuralism",
          keyThinkers: ["Michel Foucault"],
        },
      }),
    } as any);

    const post = await client.createPost({
      title: "Discipline and Punish",
      content: "Visibility is a trap in disciplinary architecture.",
      postType: "argument",
      image: fakeImage,
    });

    expect(post.title).toBe("Discipline and Punish");
    expect(post.content).toBe("Visibility is a trap in disciplinary architecture.");
    expect(post.imageUrl).toBe("https://storage.example.com/files/panopticon.jpg");
    expect(post.imageUrls).toEqual(["https://storage.example.com/files/panopticon.jpg"]);
  });

  it("4. supports multiple image attachments in post creation and feed retrieval", async () => {
    const img1 = new File([new Uint8Array([1])], "part1.png", { type: "image/png" });
    const img2 = new File([new Uint8Array([2])], "part2.png", { type: "image/png" });
    const img3 = new File([new Uint8Array([3])], "part3.png", { type: "image/png" });

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "entity-multi-1",
        title: "Syllogistic Figures",
        content: "Visualizing categorical syllogisms across moods.",
        userId: "usr-aristotle",
        files: [
          { id: "f1", originalPath: "https://storage.example.com/files/f1.png", position: 0 },
          { id: "f2", originalPath: "https://storage.example.com/files/f2.png", position: 1 },
          { id: "f3", originalPath: "https://storage.example.com/files/f3.png", position: 2 },
        ],
        metadata: {
          postType: "thesis",
          primarySchool: "Aristotelianism",
          keyThinkers: ["Aristotle"],
        },
      }),
    } as any);

    const post = await client.createPost({
      title: "Syllogistic Figures",
      content: "Visualizing categorical syllogisms across moods.",
      images: [img1, img2, img3],
    });

    expect(post.imageUrls).toHaveLength(3);
    expect(post.imageUrl).toBe("https://storage.example.com/files/f1.png");
    expect(post.imageUrls).toEqual([
      "https://storage.example.com/files/f1.png",
      "https://storage.example.com/files/f2.png",
      "https://storage.example.com/files/f3.png",
    ]);

    // Test Feed Retrieval of multi-image post
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        posts: [
          {
            id: "entity-multi-1",
            title: "Syllogistic Figures",
            content: "Visualizing categorical syllogisms across moods.",
            userId: "usr-aristotle",
            files: [
              { id: "f1", originalPath: "https://storage.example.com/files/f1.png" },
              { id: "f2", originalPath: "https://storage.example.com/files/f2.png" },
              { id: "f3", originalPath: "https://storage.example.com/files/f3.png" },
            ],
            reactionCounts: { insightful: 12, upvote: 5 },
            repliesCount: 4,
            createdAt: "2026-11-12T10:00:00Z",
            metadata: {
              postType: "thesis",
              primarySchool: "Aristotelianism",
              keyThinkers: ["Aristotle"],
            },
          },
        ],
      }),
    } as any);

    const { posts } = await client.getPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0]!.imageUrls).toHaveLength(3);
    expect(posts[0]!.imageUrl).toBe("https://storage.example.com/files/f1.png");
    expect(posts[0]!.commentsCount).toBe(4);
    expect(posts[0]!.upvotesCount).toBe(12);
  });

  it("5. propagates upload and server errors without swallowing", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({
        error: {
          code: "storage/file-too-large",
          message: "File exceeds the 25 MiB upload limit",
        },
      }),
    } as any);

    const oversizedImage = new File([new Uint8Array(10)], "huge.png", { type: "image/png" });

    await expect(
      client.createPost({
        title: "Test Oversized",
        content: "Body",
        image: oversizedImage,
      })
    ).rejects.toThrow("File exceeds the 25 MiB upload limit");
  });

  it("6. preserves existing reactions, comments count, and author metadata alongside images", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [
          {
            id: "entity-rich-1",
            title: "Being and Time",
            content: "Dasein is a being for whom its very being is an issue.",
            userId: "usr-heidegger",
            user: {
              name: "Martin Heidegger",
              username: "mheidegger",
              avatar: "https://avatar.example.com/martin.png",
            },
            files: [
              { originalPath: "https://storage.example.com/files/forest_path.jpg" },
            ],
            reactionCounts: { love: 3, upvote: 18, wow: 2, funny: 0, downvote: 0 },
            userReaction: "love",
            repliesCount: 9,
            createdAt: "2026-11-12T09:00:00Z",
            metadata: {
              postType: "argument",
              primarySchool: "Phenomenology",
              keyThinkers: ["Martin Heidegger", "Edmund Husserl"],
            },
          },
        ],
      }),
    } as any);

    const { posts } = await client.getPosts();
    const post = posts[0]!;

    expect(post.authorName).toBe("Martin Heidegger");
    expect(post.authorHandle).toBe("mheidegger");
    expect(post.authorAvatar).toBe("https://avatar.example.com/martin.png");
    expect(post.userReaction).toBe("love");
    expect(post.reactionCounts?.love).toBe(3);
    expect(post.commentsCount).toBe(9);
    expect(post.imageUrl).toBe("https://storage.example.com/files/forest_path.jpg");
    expect(post.imageUrls).toEqual(["https://storage.example.com/files/forest_path.jpg"]);
  });
});
