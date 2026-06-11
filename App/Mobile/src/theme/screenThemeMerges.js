/** Parchea estilos estáticos con tokens de tema (sin reescribir cada StyleSheet). */

function patch(s, key, extra) {
  if (!s[key]) return s;
  return { ...s, [key]: { ...s[key], ...extra } };
}

function patchMany(s, c, entries) {
  let out = { ...s };
  for (const [key, extra] of entries) {
    out = patch(out, key, typeof extra === 'function' ? extra(c) : extra);
  }
  return out;
}

const commonTop = (c) => [
  ['screen', { backgroundColor: c.background }],
  ['topBar', { backgroundColor: c.topBar, borderBottomColor: c.border }],
  ['brand', { color: c.text }],
  ['brandAccent', { color: c.brandAccent }],
  ['avatarBubble', { backgroundColor: c.avatarBg, borderColor: c.avatarBorder }],
  ['avatarText', { color: c.avatarText }],
];

export function mergeServicesTheme(s, c) {
  return patchMany(s, c, [
    ...commonTop(c),
    ['heroSection', { backgroundColor: c.card, borderColor: c.border }],
    ['heroTitle', { color: c.text }],
    ['heroSubtitle', { color: c.textSecondary }],
    ['gridCard', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['gridCardTitle', { color: c.text }],
    ['gridCardDesc', { color: c.textSecondary }],
    ['gridIconBox', { backgroundColor: c.cardAlt }],
    ['eduCard', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['eduTitle', { color: c.text }],
    ['eduBody', { color: c.textSecondary }],
    ['eduImage', { backgroundColor: c.cardAlt }],
    ['footer', { borderTopColor: c.border }],
    ['footerLink', { color: c.textSecondary }],
    ['footerCopy', { color: c.textMuted }],
    ['fabBadge', { borderColor: c.background }],
    ['dot', { backgroundColor: c.border }],
  ]);
}

export function mergeNotesTheme(s, c) {
  return patchMany(s, c, [
    ...commonTop(c),
    ['decorTop', { backgroundColor: c.decor }],
    ['brand', { color: c.text }],
    ['headerPill', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['headerPillTitle', { color: c.text }],
    ['tableCard', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['tableHeadRow', { backgroundColor: c.cardAlt, borderBottomColor: c.borderLight }],
    ['th', { color: c.textMuted }],
    ['row', { borderBottomColor: c.borderLight }],
    ['fileName', { color: c.text }],
    ['cellDate', { color: c.textSecondary }],
    ['paginationBar', { backgroundColor: c.cardAlt, borderTopColor: c.borderLight }],
    ['paginationLabel', { color: c.textSecondary }],
    ['pageBtn', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['statsTitleText', { color: c.text }],
    ['metricCard', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['metricLabel', { color: c.textMuted }],
    ['metricValue', { color: c.text }],
    ['metricValueAccent', { color: c.primary }],
    ['chartCard', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['chartHeadTitle', { color: c.text }],
    ['chartHeadTotal', { color: c.textMuted }],
    ['legendText', { color: c.textSecondary }],
    ['footerCopy', { color: c.textMuted }],
  ]);
}

export function mergeProfileTheme(s, c) {
  return patchMany(s, c, [
    ['screen', { backgroundColor: c.background }],
    ['topBar', { backgroundColor: c.topBar, borderBottomColor: c.border }],
    ['topTitle', { color: c.primaryDark }],
    ['capsule', { backgroundColor: c.cardAlt, borderColor: c.borderLight }],
    ['capsuleText', { color: c.primaryDark }],
    ['card', { backgroundColor: c.card, borderColor: c.borderLight }],
    ['cardDecor', { backgroundColor: c.decor }],
    ['avatarInner', { backgroundColor: c.card }],
    ['editPhotoBtn', { borderColor: c.card }],
    ['displayName', { color: c.text }],
    ['fieldLabel', { color: c.textMuted }],
    ['fieldBox', { backgroundColor: c.cardAlt }],
    ['fieldBoxEditing', { backgroundColor: c.inputBg, borderColor: c.border }],
    ['fieldText', { color: c.text }],
    ['fieldInput', { color: c.text }],
    ['secondaryBtn', { backgroundColor: c.cardAlt, borderColor: c.border }],
    ['secondaryBtnText', { color: c.textSecondary }],
    ['footer', { borderTopColor: c.border }],
    ['footerBrand', { color: c.primaryDark }],
    ['footerTag', { color: c.textMuted }],
    ['footerLink', { color: c.textSecondary }],
  ]);
}
