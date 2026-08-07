(() => {
  const hostname = window.location.hostname;
  const apiBaseUrl = hostname.startsWith("home.")
    ? `${window.location.protocol}//home-api.${hostname.slice("home.".length)}`
    : "https://home-backend.zhaotao0919.workers.dev";
  window.HOME_CONFIG = { API_BASE_URL: apiBaseUrl };
})();
