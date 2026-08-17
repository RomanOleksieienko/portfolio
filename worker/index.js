export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") url.pathname = "/index.html";

    let response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status === 404 && !url.pathname.split("/").pop().includes(".")) {
      url.pathname = "/index.html";
      response = await env.ASSETS.fetch(new Request(url, request));
    }
    return response;
  },
};
