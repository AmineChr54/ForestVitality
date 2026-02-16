import { AuthCallback } from "./pages/AuthCallback";
import { Logout } from "./pages/Logout";
import { SecurityConfig } from "../SecurityConfig";

export const SecurityRoutes = [
  {
    path: SecurityConfig.routes.callbackPath,
    element: <AuthCallback />,
  },
  {
    path: SecurityConfig.routes.logoutPath,
    element: <Logout />,
  },
];
