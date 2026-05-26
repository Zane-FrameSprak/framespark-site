const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, '').trim().slice(0, maxLength);
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function assertNoUnexpectedObjects(payload, allowedKeys) {
  for (const [key, value] of Object.entries(payload)) {
    if (!allowedKeys.has(key)) continue;
    if (Array.isArray(value) || isPlainObject(value)) {
      return `${key} 不能是数组或对象。`;
    }
  }
  return '';
}

export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
