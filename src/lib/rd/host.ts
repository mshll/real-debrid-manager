const HOSTS = ["https://app.real-debrid.com", "https://api.real-debrid.com"];

let preferred = 0;

/**
 * Some ISPs block one Real-Debrid hostname but not the other (#6). Both serve
 * the same API, so a network error moves on to the next host and sticks with
 * whichever answered. HTTP errors are real answers and never switch hosts.
 */
export async function rdFetch(path: string, init?: RequestInit): Promise<Response> {
  for (let tried = 1; ; tried++) {
    const index = preferred;
    try {
      return await fetch(HOSTS[index] + path, init);
    } catch (error) {
      if (tried === HOSTS.length) throw error;
      preferred = (index + 1) % HOSTS.length;
    }
  }
}
