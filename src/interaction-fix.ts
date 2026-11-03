/* Keep the game fully client-side. Generated controls must never fall back to
 * browser form submission or hash navigation. */
const normalizeControls = (): void => {
  document.querySelectorAll<HTMLButtonElement>('button:not([type])').forEach(button => {
    button.type = 'button';
  });
  document.querySelectorAll<HTMLAnchorElement>('a[href="#"]').forEach(anchor => {
    if (anchor.dataset.navigationGuarded) return;
    anchor.dataset.navigationGuarded = '1';
    anchor.addEventListener('click', event => event.preventDefault(), { passive: false });
  });
};

normalizeControls();
new MutationObserver(normalizeControls).observe(document.body, { childList: true, subtree: true });
