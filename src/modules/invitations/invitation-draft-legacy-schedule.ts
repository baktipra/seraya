const legacyEventScheduleMarker = Symbol('legacy-event-schedule-derived');

type LegacyScheduleMarker = {
  [legacyEventScheduleMarker]?: boolean;
};

export function markLegacyEventScheduleDerived<T extends object>(content: T): T {
  Object.defineProperty(content, legacyEventScheduleMarker, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });

  return content;
}

export function isLegacyEventScheduleDerived(content: object) {
  return Boolean((content as LegacyScheduleMarker)[legacyEventScheduleMarker]);
}
