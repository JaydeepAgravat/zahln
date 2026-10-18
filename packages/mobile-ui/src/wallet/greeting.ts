/** The i18n key for a time-of-day greeting ("Guten Morgen" until 11, "Hallo" until 18, then "Guten Abend"). */
export function greetingKey(hour = new Date().getHours()) {
  return hour < 11 ? 'home.greeting.morning' : hour < 18 ? 'home.greeting.day' : 'home.greeting.evening';
}
