const suffix = /^(?:jr\.?|sr\.?|ii|iii|iv|inc\.?|ltd\.?|llc)$/i;
function person(value) {
  const parts = value.split(',').map(part=>part.trim());
  if(parts.length===2 && parts.every(Boolean) && !suffix.test(parts[1])) return parts[1]+' '+parts[0];
  if(parts.length===3 && parts.every(Boolean) && suffix.test(parts[2]) && !suffix.test(parts[1])) return parts[1]+' '+parts[0]+' '+parts[2];
  return value;
}
/** Reorder explicit surname-first entries, leaving ordinary display names alone. */
export function formatAuthors(value) {
  return value.split(/\s*;\s*|\s+&\s+/).map(name=>person(name.trim())).filter(Boolean).join(' & ');
}
