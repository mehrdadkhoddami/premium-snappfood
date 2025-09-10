// popup script - load and save ad action settings
const defaultActions = {
  vendor: 'blur',
  product: 'blur',
  banner: 'blur',
  svg: 'blur'
};

function $(id) { return document.getElementById(id); }

function load() {
  if (!chrome || !chrome.storage) {
    applyDefaults();
    return;
  }
  chrome.storage.sync.get({ adActions: defaultActions }, data => {
    const a = data.adActions || defaultActions;
    $('vendorSelect').value = a.vendor || defaultActions.vendor;
    $('productSelect').value = a.product || defaultActions.product;
    $('bannerSelect').value = a.banner || defaultActions.banner;
    $('svgSelect').value = a.svg || defaultActions.svg;
  });
}

function save() {
  const a = {
    vendor: $('vendorSelect').value,
    product: $('productSelect').value,
    banner: $('bannerSelect').value,
    svg: $('svgSelect').value
  };
  if (!chrome || !chrome.storage) return;
  chrome.storage.sync.set({ adActions: a });
}

// set defaults if storage unavailable
function applyDefaults() {
  $('vendorSelect').value = defaultActions.vendor;
  $('productSelect').value = defaultActions.product;
  $('bannerSelect').value = defaultActions.banner;
  $('svgSelect').value = defaultActions.svg;
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  ['vendorSelect','productSelect','bannerSelect','svgSelect'].forEach(id => {
    const el = $(id);
    el.addEventListener('change', () => {
      save();
    });
  });
});