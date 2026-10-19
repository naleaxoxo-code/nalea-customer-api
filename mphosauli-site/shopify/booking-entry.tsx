import { createRoot } from "react-dom/client"
import BookingPage from "@/app/booking/page"

const el = document.getElementById("mpho-booking-root")
if (el) createRoot(el).render(<BookingPage />)
