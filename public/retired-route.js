(() => {
  const target = document.querySelector('meta[name="workcrute-redirect"]')?.content;
  if (target) location.replace(new URL(target, location.href).href);
})();
