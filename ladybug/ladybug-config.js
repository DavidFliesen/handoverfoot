/*
 * ARTEZIQ Ladybug Feedback — Hand Over Foot public configuration.
 *
 * Public client configuration for the central ARTEZIQ Feedback service.
 * The Supabase publishable key is shared by the ARTEZIQ Ladybug apps, and the
 * appKey below is the Hand Over Foot Public ingest key from the Feedback Dashboard.
 * These are PUBLIC client values. Never place service-role keys, GitHub tokens,
 * passwords, or other private secrets in this file.
 *
 * These are public client values. Never place service-role keys, GitHub tokens,
 * passwords, or other private secrets in this file.
 */
export const LADYBUG_CONFIG = {
  supabaseUrl: 'https://mehsjriwijsyquhmrzkh.supabase.co',
  publishableKey: 'sb_publishable_GJzFbU63AAgok24gxPrnSA_FL0H3kfu',
  appKey: 'd76571fc-9d00-49e4-b368-b426079d919e',
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
