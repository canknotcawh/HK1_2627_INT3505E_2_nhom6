import { useEffect } from "react";

export default function ShortcutBlock() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (ctrlOrMeta && ["s", "S", "p", "P", "u", "U"].includes(e.key)) {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}

