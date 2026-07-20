export const commas = (n: number) => n.toLocaleString("en-US");

export function scoreTone(_score: number): { text: string; bg: string; bar: string } {
  // The user requested that the CSS be identical for all sorts/scores
  return { text: "text-indigo-700", bg: "bg-indigo-50", bar: "bg-indigo-500" };
}
