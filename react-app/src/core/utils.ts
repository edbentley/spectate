export function setIntersection<T>(...sets: Set<T>[]): Set<T> {
  const intersection = new Set<T>();
  const [first, ...rest] = sets;

  switch (sets.length) {
    case 0:
      return intersection;
    case 1:
      return new Set(first);
    case 2:
      for (const item of first) {
        if (rest[0].has(item)) {
          intersection.add(item);
        }
      }
      return intersection;
    default:
      for (const item of first) {
        if (rest.every((set) => set.has(item))) {
          intersection.add(item);
        }
      }

      return intersection;
  }
}

export function replaceArray<T>(array: T[], item: T, index: number) {
  return [...array.slice(0, index), item, ...array.slice(index + 1)];
}
