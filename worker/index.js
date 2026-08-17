export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") url.pathname = "/index.html";

    let response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status === 404 && !url.pathname.split("/").pop().includes(".")) {
      url.pathname = "/index.html";
      response = await env.ASSETS.fetch(new Request(url, request));
    }

    if (url.pathname === "/index.html") {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("X-Portfolio-Release", "exact-youhodler");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
