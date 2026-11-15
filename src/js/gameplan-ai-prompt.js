// AI prompt for turning a photo, drawing or description of a gameplan into
// MovementApp import JSON. The prompt embeds the user's current move library
// so the AI reuses existing ids instead of creating duplicates.

const GameplanAIPrompt = {

  build(libraryEntries) {
    const entries = (libraryEntries || []).slice().sort((a, b) =>
      (a.type || '').localeCompare(b.type || '') || (a.label || '').localeCompare(b.label || ''));
    const libraryLines = entries.map(e => {
      const aliases = (e.aliases || []).length ? ' (aka ' + e.aliases.join(', ') + ')' : '';
      return e.id + ' | ' + e.type + ' | ' + e.label + aliases;
    }).join('\n');
    const today = new Date().toISOString();

    return `You are converting a Brazilian Jiu-Jitsu gameplan into JSON for the MovementApp gameplan importer.

I will give you a photo, a hand drawing, a whiteboard sketch and/or a written description of my gameplan. Read it carefully, work out every position, technique and decision branch, and turn it into a flow-chart gameplan.

OUTPUT RULES
- Reply with ONE JSON object and nothing else: no explanation, no markdown, no code fences.
- It must be valid JSON (double quotes, no comments, no trailing commas).
- Never ask me questions. If something is unclear, make the most sensible BJJ interpretation and record what you assumed in that move's notes (start the note with "Assumed:").

JSON SHAPE
{
  "app": "MovementApp",
  "version": 1,
  "exportedAt": "${today}",
  "library": [ ...NEW moves only (see "Moves")... ],
  "gameplans": [ ...exactly one gameplan... ]
}

MOVES (library entries)
Every box in the flow chart is a move. Each move has a type:
- "position"   – a place you hold or fight from (Closed Guard, Mount, Headquarters, Back Control).
- "transition" – a technique that moves you from one position to another (sweep, pass, takedown, escape, back take, guard pull).
- "submission" – a finish (choke, arm lock, leg lock).
- "reaction"   – what the opponent does that forces a decision (posts a hand, stands up, frames, hides the arm).

My library already contains the moves listed at the end of this prompt. When a move in my gameplan matches one of them (same technique, even if named slightly differently or by an alias), use that existing id in the gameplan nodes and do NOT add it to "library" – re-adding it would overwrite my notes.
Only add moves that are not in my library. Each new move is:
{
  "id": "ai-<kebab-case-name>-<4 random lowercase letters/digits>",
  "type": "position" | "transition" | "submission" | "reaction",
  "label": "Short Title Case Name",
  "notes": [ { "text": "Key details, grips, cues or anything written next to it in my gameplan.", "createdAt": "${today}" } ],
  "links": [],
  "tags": [ ...zero or more of: gi, no-gi, top, bottom, neutral, takedown, guard-pull, pass, sweep, escape, back-take, choke, arm-lock, shoulder-lock, wrist-lock, leg-lock, advanced ],
  "aliases": [ ...other common names, may be empty ],
  "variantOf": null or the id of the move it is a variation of,
  "category": one of "Standing", "Guards", "Top control", "Bad positions", "Takedowns & standing", "Passing", "Sweeps", "Escapes", "Back takes", "Chokes", "Arm attacks", "Leg attacks", "General reactions", "Submission defence", "Passing defence",
  "fromPositionId": for transitions/submissions the id of the position it starts from, else null,
  "toPositionId": for transitions the id of the position it ends in, else null
}
Use "notes": [] if there is nothing useful to note. Keep labels short (max ~4 words); put detail in notes.

THE GAMEPLAN
{
  "id": "ai-plan-<kebab-case-name>-<4 random lowercase letters/digits>",
  "name": "Gameplan name (from my title, or a short descriptive one)",
  "createdAt": "${today}",
  "updatedAt": "${today}",
  "viewport": { "x": 10, "y": 10, "zoom": 0.7 },
  "nodes": [ { "id": "<plan id>-n1", "libraryId": "<id of a move>", "x": 200, "y": 80 }, ... ],
  "connections": [ { "id": "<plan id>-c1", "fromNodeId": "<plan id>-n1", "toNodeId": "<plan id>-n2", "label": "short cue" }, ... ]
}
- One node per box in my gameplan. Every node's libraryId must be either a new move from your "library" array or an id from my existing library below.
- Connections are the arrows, pointing in the direction the action flows. Typical flow: position -> transition -> position, position -> submission, position -> reaction -> transition/submission.
- Connection "label" is the trigger or cue for taking that branch, 1–4 words ("they post", "hip escape", "underhook won"). Use "" if there is no meaningful cue.
- Make every node reachable from the starting position(s). Do not leave out branches that appear in my gameplan, and do not invent large branches that are not there.

LAYOUT (x/y in pixels, top-to-bottom tree)
- Starting position at the top: y = 80.
- Each step down the flow adds 130 to y (80, 210, 340, 470, ...).
- Spread sibling branches 220 apart in x; keep every x >= 60; centre parents roughly above their children.
- If a branch loops back to an earlier node, just connect to that existing node – never duplicate it.
- No two nodes may share the same x/y.

Double-check before replying: valid JSON, every id unique, every libraryId exists, every connection points at real node ids.

MY EXISTING LIBRARY (id | type | label)
${libraryLines || '(empty)'}

MY GAMEPLAN (attached image/drawing and/or description):
`;
  },

  // Pull the JSON object out of an AI reply that may include code fences or prose.
  extractJson(text) {
    const src = String(text || '').trim();
    try { return JSON.parse(src); } catch (e) { /* fall through */ }
    const fenced = src.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try { return JSON.parse(fenced[1].trim()); } catch (e) { /* fall through */ }
    }
    const start = src.indexOf('{');
    const end = src.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(src.slice(start, end + 1));
    }
    throw new Error('No JSON found');
  },

  // Fill in fields an AI may have left out so the import validator accepts it.
  normalize(data) {
    if (!data || typeof data !== 'object') return data;
    // A bare gameplan object (no wrapper) — wrap it
    if (!data.gameplans && Array.isArray(data.nodes)) {
      data = { library: [], gameplans: [data] };
    }
    if (!Array.isArray(data.library)) data.library = [];
    if (!Array.isArray(data.gameplans)) data.gameplans = [];
    const now = new Date().toISOString();
    data.library.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      if (!entry.id) entry.id = 'ai-' + GameplanData._uid();
      (entry.notes || []).forEach((n, i) => {
        if (typeof n === 'string') entry.notes[i] = { text: n, createdAt: now };
        else if (n && !n.createdAt) n.createdAt = now;
      });
    });
    data.gameplans.forEach(gp => {
      if (!gp || typeof gp !== 'object') return;
      if (!gp.id) gp.id = 'ai-plan-' + GameplanData._uid();
      if (!gp.name) gp.name = 'Imported Gameplan';
      if (!gp.createdAt) gp.createdAt = now;
      gp.updatedAt = now;
      if (!gp.viewport) gp.viewport = { x: 10, y: 10, zoom: 0.7 };
      if (!Array.isArray(gp.nodes)) gp.nodes = [];
      if (!Array.isArray(gp.connections)) gp.connections = [];
      gp.nodes.forEach((n, i) => {
        if (!n.id) n.id = gp.id + '-n' + (i + 1);
        n.x = Number(n.x) || 0;
        n.y = Number(n.y) || 0;
      });
      const nodeIds = new Set(gp.nodes.map(n => n.id));
      gp.connections = gp.connections.filter(c =>
        c && nodeIds.has(c.fromNodeId) && nodeIds.has(c.toNodeId));
      gp.connections.forEach((c, i) => {
        if (!c.id) c.id = gp.id + '-c' + (i + 1);
        if (typeof c.label !== 'string') c.label = '';
      });
    });
    return data;
  }
};
