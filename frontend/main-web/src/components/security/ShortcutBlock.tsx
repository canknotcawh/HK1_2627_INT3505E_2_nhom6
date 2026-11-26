import { useEffect } from "react";
import { reportSecurityEvent } from "../../lib/security-events";

export default function ShortcutBlock() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportSecurityEvent({
        eventType: "CONTEXT_MENU_BLOCKED",
        severity: "LOW",
        details: "Right-click context menu blocked",
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        reportSecurityEvent({
          eventType: "SHORTCUT_BLOCKED",
          severity: "MEDIUM",
          details: "Blocked shortcut: F12",
        });
        return;
      }

      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (ctrlOrMeta && ["s", "S", "p", "P", "u", "U"].includes(e.key)) {
        e.preventDefault();
        reportSecurityEvent({
          eventType: "SHORTCUT_BLOCKED",
          severity: "MEDIUM",
          details: `Blocked shortcut: Ctrl/Cmd+${e.key.toUpperCase()}`,
        });
        return;
      }

      if (ctrlOrMeta && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) {
        e.preventDefault();
        reportSecurityEvent({
          eventType: "SHORTCUT_BLOCKED",
          severity: "MEDIUM",
          details: `Blocked shortcut: Ctrl/Cmd+Shift+${e.key.toUpperCase()}`,
        });
        return;
      }
    };

    const handleBeforePrint = () => {
      reportSecurityEvent({
        eventType: "PRINT_ATTEMPT",
        severity: "HIGH",
        details: "Browser print dialog triggered (beforeprint)",
      });
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, []);

  return null;
}

