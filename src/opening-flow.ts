type FlowPoint = { x: number; y: number };

/** Balanced spatial transport. Nearby rain cells stay neighbours as they land.
 * Runs only when geometry is rebuilt, never in the animation loop. */
export function pairFlowPoints<S extends FlowPoint, T extends FlowPoint>(sources: S[], targets: T[]): [S, T][] {
  if (sources.length !== targets.length) throw new Error("Formation requires one source per destination");
  const pairs: [S, T][] = [];
  function partition(from: S[], to: T[]) {
    if (from.length < 2) { if (from.length) pairs.push([from[0], to[0]]); return; }
    const extent = (points: FlowPoint[], axis: "x" | "y") => {
      let low = Infinity, high = -Infinity;
      for (const point of points) { low = Math.min(low, point[axis]); high = Math.max(high, point[axis]); }
      return high - low;
    };
    const axis = extent(from, "x") + extent(to, "x") > extent(from, "y") + extent(to, "y") ? "x" : "y";
    from.sort((a, b) => a[axis] - b[axis]);
    to.sort((a, b) => a[axis] - b[axis]);
    const middle = Math.floor(from.length / 2);
    partition(from.slice(0, middle), to.slice(0, middle));
    partition(from.slice(middle), to.slice(middle));
  }
  partition([...sources], [...targets]);
  return pairs;
}

/** A single flight with a downward departure and a soft approach from above.
 * The second handle is stored relative to the articulated destination. */
export function glyphFlight(from: FlowPoint, to: FlowPoint, portraitHeight: number, priority: number, seed: number) {
  const dx = to.x - from.x, distance = Math.hypot(dx, to.y - from.y);
  const bend = Math.min(portraitHeight * .13, distance * .12) * (seed - .5);
  const departure = Math.max(14, Math.min(portraitHeight * .19, distance * .14));
  const approach = Math.max(10, Math.min(portraitHeight * .14, distance * .10));
  return {
    controls: [from.x + dx * .22 + bend * .2, from.y + departure, -dx * .16 + bend, -approach] as const,
    timing: [.008 + (1 - priority) * .035 + seed * .005, .91 + (1 - priority) * .07] as const,
  };
}
