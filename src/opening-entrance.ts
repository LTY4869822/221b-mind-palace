let warmup: Promise<void> | undefined;

/** Warm reusable modules and decoded images without mounting a second WebGL scene. */
export function warmOpeningEntrance() {
  return warmup ??= Promise.allSettled([
    import("./CharacterRigView"),
    ...["baker-street.webp", "holmes-cinematic-v4.webp", "conan-cinematic-v4.webp", "conan-blink-v5.webp"].map(name => {
      const image = new Image();
      image.decoding = "async";
      image.src = `${import.meta.env.BASE_URL}media/${name}`;
      return image.decode();
    }),
  ]).then(() => undefined);
}

/** Let the prepared HTML and poster commit before the optical crossfade starts. */
export const entrancePaint = () => new Promise<void>(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});
