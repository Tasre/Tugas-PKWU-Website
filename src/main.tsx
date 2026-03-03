import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Main entry point executing...");

// Debug environment variables
console.log("Supabase URL present:", !!import.meta.env.VITE_SUPABASE_URL);
console.log("Supabase Key present:", !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find root element");
} else {
  try {
    createRoot(rootElement).render(<App />);
    console.log("Render initiated successfully");
  } catch (error) {
    console.error("Fatal error during rendering:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please check the console for details.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>`;
  }
}
