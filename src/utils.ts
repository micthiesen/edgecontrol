export function arrayItemsEqual<T extends number | string>(a: T[], b: T[]): boolean {
  for (const i of a) {
    if (b.indexOf(i) === -1) return false;
  }
  return a.length === b.length;
}
