/**
 * Load and save code from/to the URL fragment (#code=...)
 */

// Decode the code from the hash
export function loadFromFragment() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return params.get('code') || null;
}

// Saves the code to the URL fragment
export function saveToFragment(code) {
  const params = new URLSearchParams();
  params.set('code', code);
  window.location.hash = params.toString();
}

export function clearFragment() {
  window.location.hash = '';
}

export function createFragmentLink(code) {
  const params = new URLSearchParams();
  params.set('code', code);
  return window.location.origin + window.location.pathname + '#' + params.toString();
}

export function onFragmentChange(callback) {
  // listener for fragment changes
  window.addEventListener('hashchange', () => {
    const code = loadFromFragment();
    if (code) callback(code);
  });
}
