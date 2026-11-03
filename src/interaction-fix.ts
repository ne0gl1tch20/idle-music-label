/* Keep the game fully client-side. Generated controls must never fall back to
 * browser form submission or hash navigation. */
const normalizeControls = (scope: ParentNode = document): void => {
  scope.querySelectorAll<HTMLButtonElement>('button:not([type])').forEach(button => {
    button.type = 'button';
  });
};

normalizeControls();

/* Run in capture phase so the browser's default action is cancelled before
 * delegated game handlers run. The game uses its own data-tab/data-action
 * routing and has no native form-submit buttons. */
document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest('button, a[href="#"]');
  if (control) event.preventDefault();
}, true);

new MutationObserver(records => {
  for (const record of records) {
    record.addedNodes.forEach(node => {
      if (node instanceof Element) {
        if (node.matches('button:not([type])')) (node as HTMLButtonElement).type = 'button';
        normalizeControls(node);
      }
    });
  }
}).observe(document.body, { childList: true, subtree: true });
