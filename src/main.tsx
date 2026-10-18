import { createRoot, hydrateRoot } from "react-dom/client";
import { prepareDrawerGestures } from "./lib/prepare-drawer";
import "./styles/global.css";
import "./styles/studio.css";
import { WorkspaceRoot } from "./WorkspaceRoot";

prepareDrawerGestures();

const container = document.getElementById("root")!;
if (container.hasChildNodes())
  hydrateRoot(container, <WorkspaceRoot />, { identifierPrefix: "glyphka-" });
else
  createRoot(container, { identifierPrefix: "glyphka-" }).render(
    <WorkspaceRoot />,
  );
