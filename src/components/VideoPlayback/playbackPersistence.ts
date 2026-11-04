import { z } from "zod";
import type { PlaybackStore } from "./playbackStore";
import type { JsonStorage } from "@/gateways/support/jsonStorage";

export const miniPlayerStorageKey = "kpool:mini-player:v1";
export const isPrivatePlayback = (owner: string | undefined) =>
  !!owner && (owner.startsWith("private-playlist:") || owner.startsWith("private-wiki-inbox:"));

const indexSchema = z.number().int().nonnegative();
const snapshotSchema = z.object({
  version: z.literal(1),
  privateScope: z.string().nullable(),
  session: z.object({
    owner: z.string().min(1),
    kind: z.enum(["queue", "single"]),
    tracks: z.array(z.object({
      identifier: z.string().min(1),
      videoId: z.string().min(1),
      provider: z.enum(["youtube", "tiktok"]).optional(),
      title: z.string(),
    })).min(1),
    loop: z.enum(["off", "all", "one"]),
    random: z.boolean(),
    seconds: z.number().finite().nonnegative().default(0),
    queue: z.object({
      mode: z.literal("continuous"),
      order: z.array(indexSchema).min(1),
      position: indexSchema,
      failed: z.array(indexSchema),
    }),
  }),
}).superRefine(({ session, privateScope }, context) => {
  const { queue, tracks } = session;
  if (queue.position >= queue.order.length ||
    new Set(queue.order).size !== queue.order.length ||
    [...queue.order, ...queue.failed].some((index) => index >= tracks.length) ||
    (isPrivatePlayback(session.owner) && !privateScope)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid playback snapshot" });
  }
});

// Connect only after hydration. Undefined scope means authentication is pending;
// null means no authenticated identity is available.
export function persistMiniPlayer(
  store: PlaybackStore,
  storage: JsonStorage,
  getPrivateScope: () => string | null | undefined,
) {
  let pending: z.infer<typeof snapshotSchema> | undefined;
  const remove = () => storage.remove(miniPlayerStorageKey);
  const result = snapshotSchema.safeParse(storage.read(miniPlayerStorageKey));
  if (result.success) pending = result.data;
  else remove();

  const save = () => {
    const { session, floating } = store.getState();
    const privateScope = session && isPrivatePlayback(session.owner) ? getPrivateScope() : null;
    if (!session || !floating || (isPrivatePlayback(session.owner) && !privateScope)) {
      remove();
      return;
    }
    // Persist data explicitly: page controls and callbacks belong to the current mount.
    const { owner, kind, loop, random, queue, seconds } = session;
    const tracks = session.tracks.map(({ identifier, videoId, provider, title }) => ({ identifier, videoId, provider, title }));
    storage.write(miniPlayerStorageKey, {
      version: 1, privateScope,
      session: { owner, kind, loop, random, tracks, seconds, queue: {
        mode: queue.mode, order: queue.order, position: queue.position, failed: queue.failed,
      } },
    });
  };
  const restore = () => {
    if (!pending) return;
    const snapshot = pending;
    if (isPrivatePlayback(snapshot.session.owner)) {
      const scope = getPrivateScope();
      if (scope === undefined) return;
      if (!scope || scope !== snapshot.privateScope) {
        pending = undefined;
        remove();
        return;
      }
    }
    pending = undefined;
    if (store.getState().session) return;
    const id = store.getState().generation + 1;
    const { session } = snapshot;
    store.setState({
      generation: id, floating: true, notice: null,
      session: { ...session, id, queue: {
        ...session.queue, playerIndex: session.queue.order[session.queue.position], sequence: 0,
      } },
    });
  };
  restore();
  const unsubscribe = store.subscribe(() => { pending = undefined; save(); });
  return {
    waitingForAuth: () => pending !== undefined,
    synchronizeAuth: () => { restore(); if (!pending) save(); },
    dispose: unsubscribe,
  };
}
