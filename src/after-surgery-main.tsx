import { createRoot } from "react-dom/client";
import AfterSurgery from "./pages/AfterSurgery";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

createRoot(document.getElementById("root")!).render(<AfterSurgery />);
registerServiceWorker();
