const TITLE = /^(dr|prof|engr|atty|mr|ms|mrs)\.$/i;

/** "Dr. Maria L. Reyes" -> "Maria L. Reyes" */
export const stripTitle = (name: string) => name.replace(/^(dr|prof|engr|atty|mr|ms|mrs)\.\s+/i, "");

/** "Andrea M. Santos" -> "AS" (skips titles and middle initials) */
export function initials(name: string) {
  const words = name.split(/\s+/).filter(w => w && !w.endsWith("."));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Students are greeted by first name ("Andrea"); titled staff by title + surname ("Dr. Reyes"). */
export function greetingName(user: { name: string; role: string }) {
  const words = user.name.split(/\s+/).filter(Boolean);
  if (user.role === "approver" && words.length > 1 && TITLE.test(words[0])) return `${words[0]} ${words[words.length - 1]}`;
  return stripTitle(user.name).split(/\s+/)[0] ?? user.name;
}
