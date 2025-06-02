// utils-datetime.js

export function toLocalDatetimeString(dateStr) {
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function toISOStringLocal(localStr) {
  const date = new Date(localStr);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
}

export function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return null;
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
