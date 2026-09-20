export const EXERCISES = [
  {
    title: "1. Set a prop/eVar on a click",
    goal:
      "Make a button send a specific eVar value in an AppMeasurement link-tracking hit. " +
      "Teaches linkTrackVars, pe, and pev2 -- the pieces that mark a hit as link tracking " +
      "rather than a page view.",
    hint:
      "Link tracking hits need pe=lnk_o (or lnk_d/lnk_e) to show up as a link in reports, " +
      "and pev2 for the link's display name. Setting an eVar alone isn't enough on its own " +
      "-- without pe, the hit is just a regular page view carrying that eVar.",
    path: "exercises/01-prop-evar-on-click"
  },
  {
    title: "2. Send the same intent with Web SDK",
    goal:
      "Make sendEvent() produce XDM that carries the equivalent event to exercise 1's " +
      "AppMeasurement version. Teaches the relationship between XDM and " +
      "data.__adobe.analytics.",
    hint:
      "There's no numbered eVar/prop in Web SDK -- that mapping is server-side, in the " +
      "datastream config. What you control client-side is the XDM eventType and whatever " +
      "you put in data.__adobe.analytics.contextData.",
    path: "exercises/02-same-intent-websdk"
  },
  {
    title: "3. Fix the double-fire bug",
    goal:
      "A page sends the same event twice. Fix it so the check passes. Teaches how to spot " +
      "a duplicate hit -- the kind of bug that inflates a metric by 2x and is easy to miss " +
      "just eyeballing a report.",
    hint:
      "Capture every hit the page fires for one interaction, not just the first one you " +
      "notice. If an event id shows up in two separate hits for what should be a single " +
      "click, that's the bug.",
    path: "exercises/03-fix-double-fire"
  }
];
