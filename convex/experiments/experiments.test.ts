/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { encodeTrack } from "../../src/lib/experiments/track-codec.ts";
import { buildZones, defaultParams } from "../../src/lib/tracking/templates.ts";
import type { TrackPoint } from "../../src/lib/tracking/types.ts";

const ARENA = { rect: { x: 0, y: 0, w: 100, h: 100 }, shape: "rect" as const };
const ZONES = buildZones(
  "open-field",
  { rect: ARENA.rect, shape: ARENA.shape },
  defaultParams("open-field"),
);
const TRACK: TrackPoint[] = [
  { t: 0, x: 50, y: 50, found: true, area: 10 },
  { t: 1, x: 51, y: 50, found: true, area: 10 },
  { t: 2, x: 51, y: 51, found: true, area: 10 },
];

async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "bob", name: "Bob" });
  await alice.mutation(api.users.updateCurrentUser, {});
  await bob.mutation(api.users.updateCurrentUser, {});
  const experimentId = await alice.mutation(
    api.experiments.experiments.create,
    { name: "Anxiety", templateId: "open-field" },
  );
  return { t, alice, bob, experimentId };
}

async function saveTrial(
  ctx: Awaited<ReturnType<typeof setup>>,
  subjectId: Id<"subjects">,
  trackData = encodeTrack(TRACK),
  videoStorageId?: Id<"_storage">,
) {
  const trackStorageId = await ctx.t.run((c) =>
    c.storage.store(new Blob([trackData], { type: "application/json" })),
  );
  return ctx.alice.action(api.experiments.trials.save, {
    subjectId,
    session: "Day 1",
    templateId: "open-field",
    sourceName: "clip.mp4",
    live: false,
    arena: ARENA,
    zones: ZONES,
    dims: { w: 100, h: 100 },
    pxPerCm: 2.5,
    arenaCm: 40,
    fps: 10,
    trackStorageId,
    snapshotStorageId: null,
    videoStorageId,
  });
}

describe("experiments access", () => {
  it("lists only the caller's experiments", async () => {
    const { alice, bob } = await setup();
    expect(
      await alice.query(api.experiments.experiments.list, {}),
    ).toHaveLength(1);
    expect(await bob.query(api.experiments.experiments.list, {})).toHaveLength(
      0,
    );
  });

  it("rejects signed-out callers", async () => {
    const { t } = await setup();
    await expect(
      t.query(api.experiments.experiments.list, {}),
    ).rejects.toThrow();
  });

  it("blocks other users from reading or changing an experiment", async () => {
    const { bob, experimentId } = await setup();
    await expect(
      bob.query(api.experiments.experiments.get, { experimentId }),
    ).rejects.toThrow(/access/);
    await expect(
      bob.mutation(api.experiments.subjects.create, {
        experimentId,
        code: "M1",
        groupId: null,
        sex: "male",
      }),
    ).rejects.toThrow(/access/);
    await expect(
      bob.mutation(api.experiments.experiments.remove, { experimentId }),
    ).rejects.toThrow(/access/);
  });
});

describe("accounts and sharing", () => {
  async function createAccount(
    t: ReturnType<typeof convexTest>,
    email: string,
  ) {
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email, name: email.split("@")[0] }),
    );
    return t.withIdentity({
      subject: `${userId}|test-session`,
      email,
      tokenIdentifier: `test:${email}`,
    });
  }

  it("moves browser-owned projects to the signed-in account", async () => {
    const t = convexTest(schema, modules);
    const ownerKey = "f55b0920-3f3f-4a2c-9d9e-3262e437a836";
    const anonymousId = await t.mutation(api.experiments.experiments.create, {
      name: "Local study",
      templateId: "open-field",
      ownerKey,
    });
    const owner = await createAccount(t, "owner@example.test");

    expect(
      await owner.mutation(api.users.claimAnonymousProjects, { ownerKey }),
    ).toBe(1);
    expect(
      await owner.query(api.experiments.experiments.list, {}),
    ).toHaveLength(1);
    await expect(
      t.query(api.experiments.experiments.get, {
        experimentId: anonymousId,
        ownerKey,
      }),
    ).rejects.toThrow(/not initialized/);
  });

  it("lists only projects owned by the authenticated account", async () => {
    const t = convexTest(schema, modules);
    const owner = await createAccount(t, "owner@example.test");
    const collaborator = await createAccount(t, "collaborator@example.test");
    const ownedId = await owner.mutation(api.experiments.experiments.create, {
      name: "Private project",
      templateId: "open-field",
    });
    const sharedId = await owner.mutation(api.experiments.experiments.create, {
      name: "Shared project",
      templateId: "open-field",
    });
    const { inviteToken } = await owner.mutation(
      api.experiments.sharing.invite,
      {
        experimentId: sharedId,
        email: "collaborator@example.test",
        role: "editor",
      },
    );
    await collaborator.mutation(api.experiments.sharing.acceptInvitation, {
      inviteToken,
    });

    expect(
      await collaborator.query(api.experiments.experiments.listOwned, {
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).toMatchObject({ page: [] });
    const ownedProjects = await owner.query(
      api.experiments.experiments.listOwned,
      { paginationOpts: { numItems: 10, cursor: null } },
    );
    expect(ownedProjects.page.map((project) => project._id).sort()).toEqual(
      [ownedId, sharedId].sort(),
    );
  });

  it("allows only project owners to rename or delete projects", async () => {
    const t = convexTest(schema, modules);
    const owner = await createAccount(t, "owner@example.test");
    const collaborator = await createAccount(t, "collaborator@example.test");
    const experimentId = await owner.mutation(
      api.experiments.experiments.create,
      { name: "Shared project", templateId: "open-field" },
    );
    const { inviteToken } = await owner.mutation(
      api.experiments.sharing.invite,
      {
        experimentId,
        email: "collaborator@example.test",
        role: "editor",
      },
    );
    await collaborator.mutation(api.experiments.sharing.acceptInvitation, {
      inviteToken,
    });

    await expect(
      collaborator.mutation(api.experiments.experiments.rename, {
        experimentId,
        name: "Renamed by collaborator",
      }),
    ).rejects.toThrow(/owner/);
    await expect(
      collaborator.mutation(api.experiments.experiments.remove, {
        experimentId,
      }),
    ).rejects.toThrow(/owner/);
    await owner.mutation(api.experiments.experiments.rename, {
      experimentId,
      name: "Renamed by owner",
    });
    expect(
      (await owner.query(api.experiments.experiments.get, { experimentId }))
        .experiment.name,
    ).toBe("Renamed by owner");
  });

  it("creates revocable read-only project links", async () => {
    const t = convexTest(schema, modules);
    const owner = await createAccount(t, "owner@example.test");
    const experimentId = await owner.mutation(
      api.experiments.experiments.create,
      { name: "Shared study", templateId: "open-field" },
    );
    const shareToken = await owner.mutation(
      api.experiments.sharing.updateShareLink,
      { experimentId, enabled: true },
    );
    expect(shareToken).toBeTruthy();
    expect(
      await t.query(api.experiments.sharing.sharedView, {
        shareToken: shareToken!,
      }),
    ).toMatchObject({ experiment: { name: "Shared study" }, trials: [] });

    await owner.mutation(api.experiments.sharing.updateShareLink, {
      experimentId,
      enabled: false,
    });
    expect(
      await t.query(api.experiments.sharing.sharedView, {
        shareToken: shareToken!,
      }),
    ).toBeNull();
  });

  it.each([
    ["viewer", false],
    ["editor", true],
  ] as const)("applies %s invitation permissions", async (role, canEdit) => {
    const t = convexTest(schema, modules);
    const owner = await createAccount(t, "owner@example.test");
    const collaborator = await createAccount(t, "colleague@example.test");
    const experimentId = await owner.mutation(
      api.experiments.experiments.create,
      { name: "Collaborative study", templateId: "open-field" },
    );
    const { inviteToken } = await owner.mutation(
      api.experiments.sharing.invite,
      { experimentId, email: "colleague@example.test", role },
    );
    await collaborator.mutation(api.experiments.sharing.acceptInvitation, {
      inviteToken,
    });

    expect(
      await collaborator.query(api.experiments.experiments.get, {
        experimentId,
      }),
    ).toMatchObject({ canEdit, isOwner: false });
    expect(
      await collaborator.query(api.experiments.experiments.list, {}),
    ).toHaveLength(1);
    const createSubject = collaborator.mutation(
      api.experiments.subjects.create,
      { experimentId, code: "M1", groupId: null, sex: "male" },
    );
    if (canEdit) {
      await expect(createSubject).resolves.toBeTruthy();
    } else {
      await expect(createSubject).rejects.toThrow(/access/);
    }
  });
});

describe("account preferences and deletion", () => {
  it("persists account preferences", async () => {
    const { alice } = await setup();
    const preferences = {
      theme: "dark" as const,
      landingPage: "/projects" as const,
      defaultMazeType: "elevated-plus",
      measurementUnits: "imperial" as const,
      notifications: false,
    };
    await alice.mutation(api.users.updatePreferences, { preferences });
    expect(await alice.query(api.users.getCurrentUser, {})).toMatchObject({
      preferences,
    });
  });

  it("rejects profile uploads without supported image metadata", async () => {
    const t = convexTest(schema, modules);
    const email = "avatar@example.test";
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email,
        name: "Avatar",
        tokenIdentifier: `test:${email}`,
      }),
    );
    const user = t.withIdentity({
      subject: `${userId}|test-session`,
      email,
      tokenIdentifier: `test:${email}`,
    });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob(["not an image"], { type: "image/png" }),
      ),
    );
    await expect(
      user.action(api.users.saveProfileImage, { storageId }),
    ).rejects.toThrow(/Choose a JPEG, PNG, or WebP image/);
  });

  it("revokes account access before scheduling project cleanup", async () => {
    const t = convexTest(schema, modules);
    const email = "delete-me@example.test";
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email,
        name: "Delete me",
        tokenIdentifier: `test:${email}`,
      }),
    );
    const sessionId = await t.run((ctx) =>
      ctx.db.insert("authSessions", {
        userId,
        expirationTime: Date.now() + 60_000,
      }),
    );
    const account = t.withIdentity({
      subject: `${userId}|${sessionId}`,
      email,
      tokenIdentifier: `test:${email}`,
    });
    await account.mutation(api.experiments.experiments.create, {
      name: "Will be deleted",
      templateId: "open-field",
    });

    await account.mutation(api.users.deleteAccount, {});
    expect(await t.run((ctx) => ctx.db.get("users", userId))).toBeNull();
    await expect(
      account.query(api.experiments.experiments.list, {}),
    ).rejects.toThrow();
  });
});

describe("subjects and trials", () => {
  it("rejects duplicate subject IDs within an experiment", async () => {
    const { alice, experimentId } = await setup();
    await alice.mutation(api.experiments.subjects.create, {
      experimentId,
      code: "M1",
      groupId: null,
      sex: "male",
    });
    await expect(
      alice.mutation(api.experiments.subjects.create, {
        experimentId,
        code: " M1 ",
        groupId: null,
        sex: "female",
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("keeps trial and subject counters in sync on save and delete", async () => {
    const ctx = await setup();
    const { alice, bob, experimentId } = ctx;
    const subjectId = await alice.mutation(api.experiments.subjects.create, {
      experimentId,
      code: "M1",
      groupId: null,
      sex: "male",
    });
    const trialId = await saveTrial(ctx, subjectId);

    let data = await alice.query(api.experiments.experiments.get, {
      experimentId,
    });
    expect(data.experiment.trialCount).toBe(1);
    expect(data.experiment.subjectCount).toBe(1);
    expect(data.subjects[0]?.trialCount).toBe(1);

    await expect(
      bob.query(api.experiments.trials.get, { trialId }),
    ).rejects.toThrow(/access/);
    const page = await alice.query(api.experiments.trials.listByExperiment, {
      experimentId,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page[0]?.subjectCode).toBe("M1");

    const stats = await alice.query(api.experiments.trials.statsData, {
      experimentId,
    });
    expect(stats.rows).toHaveLength(1);
    expect(
      stats.rows[0]?.measures.find((measure) => measure.label === "Center time")
        ?.value,
    ).toBe(100);
    expect(stats.rows[0]?.summary.duration).toBe(2);
    expect(stats.rows[0]?.summary.detectedPct).toBe(100);
    await expect(
      bob.query(api.experiments.trials.statsData, { experimentId }),
    ).rejects.toThrow(/access/);

    await alice.mutation(api.experiments.subjects.remove, { subjectId });
    data = await alice.query(api.experiments.experiments.get, { experimentId });
    expect(data.experiment.trialCount).toBe(0);
    expect(data.experiment.subjectCount).toBe(0);
    expect(
      await alice.query(api.experiments.trials.get, { trialId }),
    ).toBeNull();
  });

  it("rejects malformed tracks instead of saving client-supplied results", async () => {
    const ctx = await setup();
    const subjectId = await ctx.alice.mutation(
      api.experiments.subjects.create,
      {
        experimentId: ctx.experimentId,
        code: "M1",
        groupId: null,
        sex: "male",
      },
    );
    await expect(saveTrial(ctx, subjectId, "{}")).rejects.toThrow(
      /damaged|unknown format/,
    );
  });

  it("retains an attached video with the trial and deletes it with the trial", async () => {
    const ctx = await setup();
    const subjectId = await ctx.alice.mutation(
      api.experiments.subjects.create,
      {
        experimentId: ctx.experimentId,
        code: "M1",
        groupId: null,
        sex: "male",
      },
    );
    const videoStorageId = await ctx.t.run((c) =>
      c.storage.store(new Blob(["video"], { type: "video/webm" })),
    );
    const trialId = await saveTrial(ctx, subjectId, undefined, videoStorageId);
    const trial = await ctx.alice.query(api.experiments.trials.get, {
      trialId,
    });
    expect(trial?.videoUrl).toBeTruthy();

    await ctx.alice.mutation(api.experiments.trials.remove, { trialId });
    expect(await ctx.t.run((c) => c.storage.get(videoStorageId))).toBeNull();
  });

  it("ungroups subjects when their group is deleted", async () => {
    const { alice, experimentId } = await setup();
    const groupId = await alice.mutation(api.experiments.groups.create, {
      experimentId,
      name: "Control",
      color: "#22d3ee",
    });
    await alice.mutation(api.experiments.subjects.create, {
      experimentId,
      code: "M1",
      groupId,
      sex: "male",
    });
    await alice.mutation(api.experiments.groups.remove, { groupId });
    const data = await alice.query(api.experiments.experiments.get, {
      experimentId,
    });
    expect(data.groups).toHaveLength(0);
    expect(data.subjects[0]?.groupId).toBeNull();
  });
});
