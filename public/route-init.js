(() => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const isAdmin = path === "/admin" || window.location.hash === "#admin" || window.location.hash.startsWith("#admin-");
  if (isAdmin && window.top !== window.self) {
    document.documentElement.style.display = "none";
    return;
  }
  if (isAdmin || (path !== "/" && path !== "")) document.documentElement.classList.add("non-public-route");
})();
