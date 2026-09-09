export type ResumeBulletLevel = 1 | 2;

const SECONDARY_BULLET_PREFIX = "\t";

export function parseResumeBullet(bullet: string) {
  const level: ResumeBulletLevel = /^(?:\t| {2,})/.test(bullet) ? 2 : 1;
  const text = bullet.replace(/^(?:\t| {2,})/, "").trimEnd();

  return { level, text };
}

export function setResumeBulletLevel(bullet: string, level: ResumeBulletLevel) {
  const text = parseResumeBullet(bullet).text.trimStart();
  return level === 2 && text ? `${SECONDARY_BULLET_PREFIX}${text}` : text;
}

export function normalizeResumeBullet(bullet: string) {
  const { level, text } = parseResumeBullet(bullet);
  return setResumeBulletLevel(text.trim(), level);
}
