// philosopherProfileHelpers.ts
// Client-side constants and helpers for enriched philosophical profile sections.
// No backend dependency — everything is derived from existing PhilosophyProfile fields.

import type { ConnectionIntent } from "@philosophy/contract";

// ---------------------------------------------------------------------------
// 1. Thinker Metadata — era, tradition, approximate years
// ---------------------------------------------------------------------------
export interface ThinkerMeta {
  era: "Ancient" | "Medieval" | "Early Modern" | "Modern" | "Contemporary";
  tradition: string;
  years: string;
}

const THINKER_METADATA: Record<string, ThinkerMeta> = {
  // Ancient
  "Socrates":            { era: "Ancient", tradition: "Classical Greek", years: "470–399 BC" },
  "Plato":               { era: "Ancient", tradition: "Platonism", years: "428–348 BC" },
  "Aristotle":           { era: "Ancient", tradition: "Aristotelianism", years: "384–322 BC" },
  "Epicurus":            { era: "Ancient", tradition: "Epicureanism", years: "341–270 BC" },
  "Epictetus":           { era: "Ancient", tradition: "Stoicism", years: "50–135 AD" },
  "Marcus Aurelius":     { era: "Ancient", tradition: "Stoicism", years: "121–180 AD" },
  "Seneca":              { era: "Ancient", tradition: "Stoicism", years: "4 BC–65 AD" },
  "Zeno of Citium":      { era: "Ancient", tradition: "Stoicism", years: "334–262 BC" },
  "Diogenes":            { era: "Ancient", tradition: "Cynicism", years: "412–323 BC" },
  "Heraclitus":          { era: "Ancient", tradition: "Pre-Socratic", years: "535–475 BC" },
  "Parmenides":          { era: "Ancient", tradition: "Pre-Socratic", years: "515–450 BC" },
  "Plotinus":            { era: "Ancient", tradition: "Neoplatonism", years: "204–270 AD" },

  // Medieval
  "Thomas Aquinas":      { era: "Medieval", tradition: "Scholasticism", years: "1225–1274" },
  "Augustine of Hippo":  { era: "Medieval", tradition: "Christian Philosophy", years: "354–430" },
  "Avicenna":            { era: "Medieval", tradition: "Islamic Philosophy", years: "980–1037" },
  "Averroes":            { era: "Medieval", tradition: "Islamic Aristotelianism", years: "1126–1198" },
  "Maimonides":          { era: "Medieval", tradition: "Jewish Philosophy", years: "1138–1204" },

  // Early Modern
  "René Descartes":      { era: "Early Modern", tradition: "Rationalism", years: "1596–1650" },
  "Baruch Spinoza":      { era: "Early Modern", tradition: "Rationalism", years: "1632–1677" },
  "John Locke":          { era: "Early Modern", tradition: "Empiricism", years: "1632–1704" },
  "David Hume":          { era: "Early Modern", tradition: "Empiricism", years: "1711–1776" },
  "Gottfried Leibniz":   { era: "Early Modern", tradition: "Rationalism", years: "1646–1716" },
  "Thomas Hobbes":       { era: "Early Modern", tradition: "Social Contract", years: "1588–1679" },
  "Jean-Jacques Rousseau": { era: "Early Modern", tradition: "Social Contract", years: "1712–1778" },
  "Blaise Pascal":       { era: "Early Modern", tradition: "Fideism", years: "1623–1662" },

  // Modern
  "Immanuel Kant":       { era: "Modern", tradition: "German Idealism", years: "1724–1804" },
  "Georg Wilhelm Friedrich Hegel": { era: "Modern", tradition: "German Idealism", years: "1770–1831" },
  "Arthur Schopenhauer": { era: "Modern", tradition: "Pessimism", years: "1788–1860" },
  "Friedrich Nietzsche": { era: "Modern", tradition: "Existentialism", years: "1844–1900" },
  "Søren Kierkegaard":   { era: "Modern", tradition: "Existentialism", years: "1813–1855" },
  "Karl Marx":           { era: "Modern", tradition: "Marxism", years: "1818–1883" },
  "John Stuart Mill":    { era: "Modern", tradition: "Utilitarianism", years: "1806–1873" },
  "William James":       { era: "Modern", tradition: "Pragmatism", years: "1842–1910" },
  "Charles Sanders Peirce": { era: "Modern", tradition: "Pragmatism", years: "1839–1914" },

  // Contemporary
  "Jean-Paul Sartre":    { era: "Contemporary", tradition: "Existentialism", years: "1905–1980" },
  "Simone de Beauvoir":  { era: "Contemporary", tradition: "Existential Feminism", years: "1908–1986" },
  "Albert Camus":        { era: "Contemporary", tradition: "Absurdism", years: "1913–1960" },
  "Martin Heidegger":    { era: "Contemporary", tradition: "Phenomenology", years: "1889–1976" },
  "Maurice Merleau-Ponty": { era: "Contemporary", tradition: "Phenomenology", years: "1908–1961" },
  "Edmund Husserl":      { era: "Contemporary", tradition: "Phenomenology", years: "1859–1938" },
  "Hannah Arendt":       { era: "Contemporary", tradition: "Political Philosophy", years: "1906–1975" },
  "Ludwig Wittgenstein": { era: "Contemporary", tradition: "Analytic Philosophy", years: "1889–1951" },
  "Michel Foucault":     { era: "Contemporary", tradition: "Post-Structuralism", years: "1926–1984" },
  "Jacques Derrida":     { era: "Contemporary", tradition: "Deconstruction", years: "1930–2004" },
  "Gilles Deleuze":      { era: "Contemporary", tradition: "Post-Structuralism", years: "1925–1995" },
  "Jürgen Habermas":     { era: "Contemporary", tradition: "Critical Theory", years: "1929–" },
  "John Rawls":          { era: "Contemporary", tradition: "Political Liberalism", years: "1921–2002" },
  "Iris Murdoch":        { era: "Contemporary", tradition: "Moral Philosophy", years: "1919–1999" },
  "Simone Weil":         { era: "Contemporary", tradition: "Mystical Philosophy", years: "1909–1943" },
  "Martha Nussbaum":     { era: "Contemporary", tradition: "Capabilities Approach", years: "1947–" },
  "Cornel West":         { era: "Contemporary", tradition: "Pragmatism", years: "1953–" },
  "Slavoj Žižek":        { era: "Contemporary", tradition: "Lacanian Marxism", years: "1949–" },
  "Byung-Chul Han":      { era: "Contemporary", tradition: "Cultural Criticism", years: "1959–" },
};

export function getThinkerMeta(name: string): ThinkerMeta {
  return THINKER_METADATA[name] ?? {
    era: "Contemporary" as const,
    tradition: "Philosophy",
    years: "",
  };
}

// ---------------------------------------------------------------------------
// 2. School → Philosophical Domain mapping (for Intellectual Compass)
// ---------------------------------------------------------------------------
const SCHOOL_DOMAIN_MAP: Record<string, string> = {
  // Epistemology
  "Rationalism": "Epistemology",
  "Empiricism": "Epistemology",
  "Pragmatism": "Epistemology",
  "Skepticism": "Epistemology",
  "Phenomenology": "Epistemology",

  // Ethics
  "Stoicism": "Ethics",
  "Utilitarianism": "Ethics",
  "Virtue Ethics": "Ethics",
  "Deontology": "Ethics",
  "Care Ethics": "Ethics",
  "Moral Relativism": "Ethics",

  // Metaphysics
  "Determinism": "Metaphysics",
  "Compatibilism": "Metaphysics",
  "Idealism": "Metaphysics",
  "Materialism": "Metaphysics",
  "Dualism": "Metaphysics",
  "Monism": "Metaphysics",

  // Existential / Meaning
  "Existentialism": "Existence & Meaning",
  "Absurdism": "Existence & Meaning",
  "Nihilism": "Existence & Meaning",
  "Humanism": "Existence & Meaning",

  // Political
  "Marxism": "Political Philosophy",
  "Liberalism": "Political Philosophy",
  "Anarchism": "Political Philosophy",
  "Communitarianism": "Political Philosophy",

  // Logic & Language
  "Analytic Philosophy": "Logic & Language",
  "Logical Positivism": "Logic & Language",
  "Structuralism": "Logic & Language",
  "Post-Structuralism": "Critical Theory",
  "Deconstruction": "Critical Theory",
  "Critical Theory": "Critical Theory",
};

export interface CompassEntry {
  domain: string;
  school: string;
}

export function getIntellectualCompass(schools: string[]): CompassEntry[] {
  const seen = new Set<string>();
  const entries: CompassEntry[] = [];
  for (const school of schools) {
    const domain = SCHOOL_DOMAIN_MAP[school] || "Philosophy";
    const key = `${domain}-${school}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ domain, school });
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// 3. Habit Suggestions — derived from schools and intents
// ---------------------------------------------------------------------------
interface HabitSuggestion {
  label: string;
  emoji: string;
}

const SCHOOL_HABITS: Record<string, HabitSuggestion[]> = {
  "Stoicism":       [{ label: "Morning Meditation", emoji: "🧘" }, { label: "Negative Visualization", emoji: "🌑" }, { label: "Evening Reflection", emoji: "🌙" }],
  "Existentialism": [{ label: "Journaling on Authenticity", emoji: "📓" }, { label: "Contemplative Walk", emoji: "🚶" }],
  "Rationalism":    [{ label: "Thought Experiments", emoji: "💭" }, { label: "Logical Analysis Hour", emoji: "🧩" }],
  "Phenomenology":  [{ label: "Mindful Observation", emoji: "👁️" }, { label: "Descriptive Journaling", emoji: "✍️" }],
  "Utilitarianism": [{ label: "Consequence Mapping", emoji: "🗺️" }, { label: "Ethical Audit", emoji: "⚖️" }],
  "Virtue Ethics":  [{ label: "Character Reflection", emoji: "🪞" }, { label: "Virtue Practice", emoji: "🏛️" }],
  "Determinism":    [{ label: "Causal Chain Reflection", emoji: "🔗" }],
  "Compatibilism":  [{ label: "Free Will Journaling", emoji: "🕊️" }],
  "Absurdism":      [{ label: "Embrace the Absurd", emoji: "🎭" }, { label: "Creative Rebellion", emoji: "🎨" }],
  "Pragmatism":     [{ label: "Practical Inquiry", emoji: "🔍" }, { label: "Experimental Living", emoji: "🧪" }],
  "Skepticism":     [{ label: "Question Everything Hour", emoji: "❓" }],
  "Empiricism":     [{ label: "Observational Study", emoji: "🔬" }],
};

const INTENT_HABITS: Record<string, HabitSuggestion[]> = {
  "discussion":    [{ label: "Socratic Dialogue", emoji: "🗣️" }, { label: "Dialectical Debate", emoji: "⚔️" }],
  "intellectual":  [{ label: "Deep Reading Hour", emoji: "📚" }, { label: "Concept Mapping", emoji: "🧠" }],
  "friendship":    [{ label: "Philosophical Letter-Writing", emoji: "✉️" }],
  "dating":        [{ label: "Shared Contemplation", emoji: "💫" }],
};

export function getPhilosophicalHabits(schools: string[], intents: ConnectionIntent[]): HabitSuggestion[] {
  const seen = new Set<string>();
  const habits: HabitSuggestion[] = [];

  for (const school of schools) {
    for (const h of (SCHOOL_HABITS[school] || [])) {
      if (!seen.has(h.label)) {
        seen.add(h.label);
        habits.push(h);
      }
    }
  }

  for (const intent of intents) {
    for (const h of (INTENT_HABITS[intent] || [])) {
      if (!seen.has(h.label)) {
        seen.add(h.label);
        habits.push(h);
      }
    }
  }

  // Cap at 8 to keep it visually clean
  return habits.slice(0, 8);
}

// ---------------------------------------------------------------------------
// 4. Era colors for lineage badges
// ---------------------------------------------------------------------------
export const ERA_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Ancient":      { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", text: "#fbbf24" },
  "Medieval":     { bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.4)", text: "#a78bfa" },
  "Early Modern": { bg: "rgba(14, 165, 233, 0.15)", border: "rgba(14, 165, 233, 0.4)", text: "#38bdf8" },
  "Modern":       { bg: "rgba(34, 197, 94, 0.15)",  border: "rgba(34, 197, 94, 0.4)",  text: "#4ade80" },
  "Contemporary": { bg: "rgba(244, 63, 94, 0.15)",  border: "rgba(244, 63, 94, 0.4)",  text: "#fb7185" },
};

// ---------------------------------------------------------------------------
// 5. Bookshelf spine colors (rotating palette)
// ---------------------------------------------------------------------------
export const BOOK_SPINE_COLORS = [
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
];
