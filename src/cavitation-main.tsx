import { createRoot } from "react-dom/client";
import CavitationBodyContouring from "./pages/CavitationBodyContouring";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

createRoot(document.getElementById("root")!).render(<CavitationBodyContouring />);
registerServiceWorker();
