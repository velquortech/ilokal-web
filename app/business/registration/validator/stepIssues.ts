/**
 * Turn the current step's validation errors into a list a shop owner can act on.
 *
 * Why this exists: the wizard used to DISABLE Next while a step was invalid
 * (`register-nav.tsx`, `disabled={!canProceed}`). React Hook Form only surfaces
 * an error once its field is TOUCHED, so an owner who never focused a required
 * field saw a dead grey button and no statement of what was missing — the
 * measured dead end behind the registration funnel's 49% drop-off. Worse, it
 * also made the `reg_step_error` funnel event unreachable: `nextStep()` could
 * never run while invalid, so the one event built to name the stalling field
 * had zero rows and always would.
 *
 * The summary is built from the ZOD MESSAGES, not from a field→label map. Those
 * messages are already written for owners ("Set your location coordinates to
 * continue", "At least 4 images required"), they live next to the rule they
 * describe, and a map would be a second copy of every field name that could
 * drift from the schema. See `.claude/REGISTRATION_FUNNEL.md` (P4).
 */

/** One actionable problem: where it is, and what to tell the owner. */
export interface StepIssue {
  /** Dot path, RHF-shaped (`location.zip_code`, `offerings.0.name`). Feeds `setFocus`. */
  path: string;
  message: string;
}

/**
 * RHF's error tree is recursive and its leaves carry bookkeeping keys we must
 * not walk into (`ref` holds a DOM node — descending into it would traverse the
 * document).
 */
const BOOKKEEPING_KEYS = new Set(['ref', 'type', 'types']);

/** Depth guard: the deepest real path is `offerings.<i>.<field>` (3). */
const MAX_DEPTH = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function walk(node: unknown, path: string, depth: number, out: StepIssue[]) {
  if (!isRecord(node) || depth > MAX_DEPTH) return;

  // A leaf. RHF also hangs an array-level error on the ARRAY object itself, so a
  // node can carry both a message and children; emitting the message and NOT
  // descending is deliberate — "At least 4 images required" is the actionable
  // line, and the per-item errors underneath it are noise to an owner.
  if (typeof node.message === 'string' && node.message.length > 0) {
    out.push({ path, message: node.message });
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((child, index) => {
      walk(child, path ? `${path}.${index}` : String(index), depth + 1, out);
    });
    return;
  }

  for (const key of Object.keys(node)) {
    if (BOOKKEEPING_KEYS.has(key)) continue;
    // `root` is where RHF puts a field-ARRAY level error. It is a container,
    // not a field, so it must not appear in the path handed to `setFocus`.
    const childPath = key === 'root' ? path : path ? `${path}.${key}` : key;
    walk(node[key], childPath, depth + 1, out);
  }
}

/**
 * Collect the actionable issues for ONE step.
 *
 * Scoped to `fields` — the step's own field group — so the summary can never
 * show an owner an error from a step they have not reached. That scoping is the
 * whole reason this takes the group rather than reading the entire error tree.
 *
 * Deduped by `path + message`: a single underlying problem can appear twice in
 * the tree (an array root error plus its item), and telling an owner the same
 * thing twice reads like two separate faults.
 */
export function collectStepIssues(
  errors: unknown,
  fields: readonly string[],
): StepIssue[] {
  if (!isRecord(errors)) return [];

  const out: StepIssue[] = [];
  for (const field of fields) {
    // Only the group's ROOT keys are read. A nested path in the group (none
    // today) would still resolve, because `walk` builds the full path itself.
    if (field in errors) walk(errors[field], field, 0, out);
  }

  const seen = new Set<string>();
  return out.filter((issue) => {
    const key = `${issue.path}::${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
