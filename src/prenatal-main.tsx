import { createRoot } from "react-dom/client";
import PrenatalPostnatalMassage from "./pages/PrenatalPostnatalMassage";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrenatalPostnatalMassage />);
registerServiceWorker();
