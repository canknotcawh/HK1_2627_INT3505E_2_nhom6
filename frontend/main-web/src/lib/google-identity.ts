type GoogleBooksViewer = {
    load: (identifier: string, notFound?: () => void, success?: () => void) => void;
};

export type GoogleBooksApi = {
    load: (options?: { language?: string }) => void;
    setOnLoadCallback: (callback: () => void) => void;
    DefaultViewer: new (container: HTMLElement) => GoogleBooksViewer;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
      books?: GoogleBooksApi;
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let loading: Promise<void> | undefined;

export function loadGoogleIdentityScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không thể tải Google Identity Services."));
    document.head.appendChild(script);
  });

  return loading;
}
