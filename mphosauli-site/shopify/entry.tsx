import { createRoot } from "react-dom/client"
import Home from "@/app/page"

const el = document.getElementById("mpho-root")
if (el) createRoot(el).render(<Home />)
