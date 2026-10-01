"use client";

import dynamic from "next/dynamic";

// Loaded in its own async chunk so the dev-only Agentation bundle never
// blocks or bloats the root app/layout.js chunk. `ssr: false` requires a
// Client Component boundary, so this wrapper exists purely to host it.
const Agentation = dynamic(
  () => import("agentation").then((mod) => mod.Agentation),
  { ssr: false },
);

export function AgentationLoader() {
  return <Agentation />;
}
