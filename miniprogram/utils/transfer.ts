/**
 * 页面间对象传递的简易暂存（同一小程序运行时内有效）。
 * 用于 navigateTo 无法承载的大对象（如错题重练的完整题面）。
 */
const stash = new Map<string, unknown>();

export function setStash(key: string, value: unknown): void {
  stash.set(key, value);
}

export function getStash<T>(key: string): T | null {
  return (stash.get(key) as T) ?? null;
}

export function popStash<T>(key: string): T | null {
  const value = (stash.get(key) as T) ?? null;
  stash.delete(key);
  return value;
}
