export type TimeSlot = "morning" | "afternoon" | "evening" | "night"

/** Same slot boundaries the backend uses: 5–11 morning, 12–16 afternoon, 17–21 evening, else night. */
export function timeSlotFromHour(hour: number): TimeSlot {
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 22) return "evening"
  return "night"
}

/** Time slot from the browser's local clock. */
export function currentTimeSlot(now: Date = new Date()): TimeSlot {
  return timeSlotFromHour(now.getHours())
}
