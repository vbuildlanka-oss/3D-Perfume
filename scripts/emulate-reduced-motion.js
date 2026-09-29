// Injected before any page JS so useEnvironmentFlags() reports reduced motion.
// Exercises: no idle auto-rotation, no pointer parallax, no bob, and
// linear-only (unsmoothed) scroll-tied camera moves.
const nativeMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) => {
  const result = nativeMatchMedia(query);
  if (query.includes('prefers-reduced-motion')) {
    return { ...result, matches: true, media: query, addEventListener() {}, removeEventListener() {} };
  }
  return result;
};
