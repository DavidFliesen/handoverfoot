/*
 * ARTEZIQ Ladybug Feedback — Hand Over Foot public configuration.
 *
 * Fill in the SAME Supabase publishable key used by the other ARTEZIQ Ladybug apps,
 * plus the Hand Over Foot Public ingest key created in the Feedback Dashboard.
 * These are PUBLIC client values. Never place service-role keys, GitHub tokens,
 * passwords, or other private secrets in this file.
 *
 * Until the two REPLACE_* values are filled in, Hand Over Foot runs normally and
 * the Ladybug launcher stays hidden.
 */
export const LADYBUG_CONFIG = {
  supabaseUrl: 'https://mehsjriwijsyquhmrzkh.supabase.co',
  publishableKey: 'REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY',
  appKey: 'REPLACE_WITH_HAND_OVER_FOOT_PUBLIC_INGEST_KEY',
  slug: 'hand-over-foot',
  iconUrl: 'ladybug/assets/ladybug-feedback-icon-256.png',

  // Hand Over Foot has both a bottom action bar and the ARTEZIQ footer.
  // Keep the floating launcher above those controls.
  bottomOffsetPx: 120,
  bottomOffsetPhonePx: 112,
};

export function ladybugConfigured(cfg = LADYBUG_CONFIG) {
  const real = (v, min) =>
    typeof v === 'string' &&
    v.length >= min &&
    !/^REPLACE/i.test(v) &&
    !/\s/.test(v);

  return real(cfg.publishableKey, 20) &&
         real(cfg.appKey, 8) &&
         real(cfg.slug, 3);
}
