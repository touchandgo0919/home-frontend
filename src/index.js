const configResponse = (env) =>
  new Response(
    `window.HOME_CONFIG = ${JSON.stringify({ API_BASE_URL: env.HOME_API_BASE_URL || "" }, null, 2)};\n`,
    {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/config.js") {
      return configResponse(env);
    }

    if (url.pathname === "/admin") {
      url.pathname = "/admin/";
      return Response.redirect(url.toString(), 308);
    }

    return env.STATIC_ASSETS.fetch(request);
  },
};
