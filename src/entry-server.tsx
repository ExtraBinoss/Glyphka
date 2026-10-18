import { prerender } from "react-dom/static";
import { WorkspaceRoot } from "./WorkspaceRoot";

export async function render() {
  const { prelude, postponed } = await prerender(<WorkspaceRoot />, {
    identifierPrefix: "glyphka-",
  });
  if (postponed) throw new Error("The studio must be fully prerendered.");
  return new Response(prelude).text();
}
