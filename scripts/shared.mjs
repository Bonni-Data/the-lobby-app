// THE LOBBY · helpers shared by the public pages (site.mjs) and the Telegram channel (telegram.mjs),
// so both build exactly the same page addresses.
export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
}
export const oppSlug = (o) => `${slugify(o.title).slice(0, 60).replace(/-+$/, '')}-${String(o.id).slice(0, 6)}`;
export const newsSlug = (date, title) => `${date}-${slugify(title).slice(0, 60).replace(/-+$/, '')}`;
