/**
 * Google Identity Services (GIS) loader. Produces an ID token ("credential") that the backend
 * verifies with Google before issuing a NestIn session. Requires VITE_GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_ID to be configured; otherwise the Google button reports that it is unavailable.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (
            listener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getNotDisplayedReason?: () => string;
            }) => void
          ) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load Google Sign-In. Check your network or ad-blocker.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Opens the Google One Tap / account chooser and resolves with the ID token. Falls back to a
 * rendered button in a temporary overlay when the prompt cannot be displayed (e.g. cookies blocked).
 */
export async function requestGoogleCredential(clientId: string): Promise<string> {
  await loadScript();
  const gis = window.google?.accounts?.id;
  if (!gis) throw new Error('Google Sign-In is unavailable in this browser.');

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const overlay = document.createElement('div');
    const cleanup = () => {
      overlay.remove();
      gis.cancel();
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    gis.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (response.credential) finish(() => resolve(response.credential!));
        else finish(() => reject(new Error('Google did not return a credential.')));
      },
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    // Explicit button overlay: the most reliable path across browsers and cookie settings.
    overlay.setAttribute('role', 'dialog');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.55);backdrop-filter:blur(4px)';
    const card = document.createElement('div');
    card.style.cssText =
      'background:#fff;border-radius:20px;padding:28px 28px 20px;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center;font-family:Inter,system-ui,sans-serif;max-width:340px;width:90%';
    card.innerHTML =
      '<div style="font-weight:800;font-size:16px;color:#0f172a;margin-bottom:6px">Continue with Google</div><div style="font-size:12px;color:#64748b;margin-bottom:18px">Choose the Google account you want to use for NestIn.</div>';
    const buttonHost = document.createElement('div');
    buttonHost.style.cssText = 'display:flex;justify-content:center';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.style.cssText =
      'margin-top:16px;background:none;border:none;color:#64748b;font-size:12px;font-weight:600;cursor:pointer';
    cancel.onclick = () => finish(() => reject(new Error('Google sign-in was cancelled.')));
    card.appendChild(buttonHost);
    card.appendChild(cancel);
    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(() => reject(new Error('Google sign-in was cancelled.')));
    });
    document.body.appendChild(overlay);
    gis.renderButton(buttonHost, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 280 });
  });
}
