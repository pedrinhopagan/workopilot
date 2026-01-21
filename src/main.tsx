import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./routerConfig";
import { startTypesenseSync } from "./services/typesenseSync";
import "./app.css";

startTypesenseSync().catch(() => {});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
