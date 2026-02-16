// security/ui/pages/Logout.tsx
import { useEffect } from "react";
import { SecurityAPI } from "../../SecurityAPI";

export function Logout() {
  useEffect(() => {
    SecurityAPI.logout();
  }, []);

  return <div>Logging you out…</div>;
}
