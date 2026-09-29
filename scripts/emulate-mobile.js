// Injected before any page JS so useEnvironmentFlags() reads mobile values.
// Exercises: 15 bokeh particles, dpr cap [1, 1.5], chromaticAberration 0,
// and camera travel compressed to 60%.
Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });

const nativeMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) => {
  const result = nativeMatchMedia(query);
  if (query.includes('max-width')) {
    return { ...result, matches: true, media: query, addEventListener() {}, removeEventListener() {} };
  }
  return result;
};
