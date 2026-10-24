export type PlaybackQueue = {
  mode: "continuous";
  order: number[];
  position: number;
  playerIndex: number;
  sequence: number;
  failed: number[];
};

export function playbackOrder(indices: number[], random: boolean): number[] {
  const order = [...indices];
  if (random) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return order;
}

export function advancePlayback(
  current: PlaybackQueue,
  options: { loop: boolean; random: boolean; failed: boolean },
): PlaybackQueue | null {
  const index = current.order[current.position];
  const failed = options.failed ? [...current.failed, index] : current.failed;
  if (current.position + 1 < current.order.length) {
    return {
      ...current,
      position: current.position + 1,
      playerIndex: current.order[current.position + 1],
      sequence: current.sequence + 1,
      failed,
    };
  }
  if (!options.loop) return null;
  const eligible = current.order.filter((item) => !failed.includes(item));
  // Restore display order before starting another sequential pass.
  const order = playbackOrder(eligible.sort((a, b) => a - b), options.random);
  if (!order.length) return null;
  // Avoid repeating the last video at the boundary of shuffled passes.
  if (options.random && order.length > 1 && order[0] === index) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return {
    mode: "continuous",
    order,
    position: 0,
    playerIndex: order[0],
    sequence: current.sequence + 1,
    failed,
  };
}
