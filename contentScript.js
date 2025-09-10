// optimized content script - process only new nodes, debounce using idle
(() => {
  const SELECTOR_VENDOR = 'a#vendorCard, a[data-sentry-component="VendorCard"]';
  const SELECTOR_PRODUCT = '[data-sentry-component="HorizontalProductCard"]';
  const SELECTOR_PRODUCT_WRAPPER = '#search-vendor-product[data-sentry-component="HorizontalProductCard"]';
  const SELECTOR_BANNER = '[data-sentry-component="Banner"]';
  const AD_MARKER_SELECTOR = '[data-sentry-component="Ads"]';
  const CHECKED_FLAG = 'data-premium-sf-checked';
  const SVG_AD_PATH_SNIPPET = 'M19 11.5v3.742';

  // small utility to schedule work during idle (fallback to setTimeout)
  const idle = typeof requestIdleCallback === 'function'
    ? cb => requestIdleCallback(cb, { timeout: 200 })
    : cb => setTimeout(cb, 50);

  function mark(el) {
    if (!el) return false;
    if (el.hasAttribute(CHECKED_FLAG)) return false;
    el.setAttribute(CHECKED_FLAG, '1');
    return true;
  }

  function svgIsAd(svg) {
    if (!svg) return false;
    try {
      const path = svg.querySelector('path');
      const d = path && path.getAttribute('d');
      if (d && d.indexOf('M19 11.5') !== -1) return true;
      if (svg.outerHTML && svg.outerHTML.indexOf(SVG_AD_PATH_SNIPPET) !== -1) return true;
    } catch (e) { return false; }
    return false;
  }

  // hide by setting attribute + class (CSS will hide)
  function hideSmall(el) {
    if (!el) return;
    if (!mark(el)) return;
    el.classList.add('sf-hidden-by-ext');
  }

  // process a node: check if it or its descendants match our targets
  function processNode(node) {
    if (!node || node.nodeType !== 1) return;

    // vendor cards
    if (node.matches && node.matches(SELECTOR_VENDOR)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        if (node.querySelector(AD_MARKER_SELECTOR) || Array.from(node.querySelectorAll('svg')).some(svgIsAd)) {
          // hide the anchor itself (small)
          hideSmall(node);
          return;
        }
      }
    }
    // product wrapper specific id
    if (node.matches && node.matches(SELECTOR_PRODUCT_WRAPPER)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        if (Array.from(node.querySelectorAll('svg')).some(svgIsAd)) {
          hideSmall(node);
          return;
        }
      }
    }
    // generic product card
    if (node.matches && node.matches(SELECTOR_PRODUCT)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        if (Array.from(node.querySelectorAll('svg')).some(svgIsAd)) {
          hideSmall(node);
          return;
        }
      }
    }
    // banner
    if (node.matches && node.matches(SELECTOR_BANNER)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        const img = node.querySelector('img[alt]');
        if (img && typeof img.alt === 'string' && img.alt.toLowerCase().includes('ads_banner')) {
          hideSmall(node);
          return;
        }
      }
    }

    // if node doesn't match directly, check descendants but limit scope
    // search only for our selectors inside this node
    const vendor = node.querySelector && node.querySelector(SELECTOR_VENDOR);
    if (vendor) processNode(vendor);
    const productWrapper = node.querySelector && node.querySelector(SELECTOR_PRODUCT_WRAPPER);
    if (productWrapper) processNode(productWrapper);
    const product = node.querySelector && node.querySelector(SELECTOR_PRODUCT);
    if (product) processNode(product);
    const banner = node.querySelector && node.querySelector(SELECTOR_BANNER);
    if (banner) processNode(banner);

    // standalone SVGs inside this node (cheap scan limited to node)
    const svgs = node.querySelectorAll ? node.querySelectorAll('svg') : [];
    if (svgs.length) {
      for (let svg of svgs) {
        if (!svgIsAd(svg)) continue;
        // prefer small nearest targets
        const vendorAncestor = svg.closest && svg.closest('a[data-sentry-component="VendorCard"], a#vendorCard');
        if (vendorAncestor) { hideSmall(vendorAncestor); break; }
        const specificWrapper = svg.closest && svg.closest('#search-vendor-product[data-sentry-component="HorizontalProductCard"]');
        if (specificWrapper) { hideSmall(specificWrapper); break; }
        const productAncestor = svg.closest && svg.closest('[data-sentry-component="HorizontalProductCard"]');
        if (productAncestor) { hideSmall(productAncestor); break; }
        const parent = svg.parentElement;
        if (parent) { hideSmall(parent); break; }
      }
    }
  }

  // initial scan once (during idle)
  idle(() => {
    // scan only top-level matches to avoid full-document repeated scans
    document.querySelectorAll(SELECTOR_VENDOR + ',' + SELECTOR_PRODUCT_WRAPPER + ',' + SELECTOR_PRODUCT + ',' + SELECTOR_BANNER)
      .forEach(el => processNode(el));
    // also scan for svg markers that might be outside above selectors
    document.querySelectorAll('svg').forEach(svg => {
      if (svgIsAd(svg)) processNode(svg);
    });
  });

  // MutationObserver: examine added nodes only, schedule processing in idle
  const mutationQueue = new Set();
  let scheduled = false;

  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      // collect added element nodes
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) mutationQueue.add(n);
      }
      // if attributes changed and it's one of our selectors, re-check that node
      if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
        mutationQueue.add(m.target);
      }
    }
    if (!scheduled) {
      scheduled = true;
      idle(() => {
        scheduled = false;
        const toProcess = Array.from(mutationQueue);
        mutationQueue.clear();
        toProcess.forEach(n => {
          // skip if page hidden to avoid wasted work
          if (document.visibilityState === 'hidden') return;
          processNode(n);
        });
      });
    }
  });

  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true, attributes: false }); 
  } else {
    // wait for body
    const docObs = new MutationObserver((_, o) => {
      if (document.body) {
        o.disconnect();
        mo.observe(document.body, { childList: true, subtree: true, attributes: false });
      }
    });
    docObs.observe(document.documentElement, { childList: true });
  }

  // SPA navigation hooks - re-run a small scan on navigation
  const origPush = history.pushState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    idle(() => {
      document.querySelectorAll(SELECTOR_VENDOR + ',' + SELECTOR_PRODUCT_WRAPPER + ',' + SELECTOR_PRODUCT + ',' + SELECTOR_BANNER)
        .forEach(el => processNode(el));
    });
  };
  window.addEventListener('popstate', () => idle(() => {
    document.querySelectorAll(SELECTOR_VENDOR + ',' + SELECTOR_PRODUCT_WRAPPER + ',' + SELECTOR_PRODUCT + ',' + SELECTOR_BANNER)
      .forEach(el => processNode(el));
  }));

  // clean up on unload
  window.addEventListener('beforeunload', () => {
    mo.disconnect();
  });
})();