/**
 * Prefix a root-relative path with Astro's configured `base`.
 *
 * Use for anything Astro will not rewrite for us: `public/` asset references
 * (`<img src>`, CSS `url()`) and hand-written internal links and redirects.
 * Assets imported through the build pipeline already get the base, so do not
 * wrap those.
 *
 * `import.meta.env.BASE_URL` is `/` in dev and `/ltinfo-monitoring-dashboard`
 * in a production build. Whether it carries a trailing slash depends on the
 * `trailingSlash` setting (Astro strips it under 'never'), so joinBase()
 * normalizes both sides and never doubles or drops the separator.
 */
export const joinBase = (base: string, path: string): string => {
  const root = base.replace(/\/+$/, '');
  const rest = path.replace(/^\/+/, '');
  return `${root}/${rest}`;
};

export const withBase = (path: string): string => joinBase(import.meta.env.BASE_URL, path);
