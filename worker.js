export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Guest-Mode, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const pathname = url.pathname;

    // --- CẤU HÌNH BẢO MẬT (ẨN KHỎI FRONTEND) ---
    const GOOGLE_CLIENT_ID = "305607144766-rsp6v0i6b0n83u989ojpinptq5a9l21c.apps.googleusercontent.com";
    const WEBHOOKS = {
      chat: "",
      delete: "",
      contact: "",
      google: "",
      login: "",
      signup: "",
      verify: "",
      forgot_req: "",
      forgot_res: ""
    };

    // Endpoint lấy ID Google
    if (pathname === "/config") {
      return new Response(JSON.stringify({ googleClientId: GOOGLE_CLIENT_ID }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Điều hướng Webhook
    let targetUrl = null;
    if (pathname.includes("/chat")) targetUrl = WEBHOOKS.chat + url.search;
    else if (pathname.includes("/google-login")) targetUrl = WEBHOOKS.google + url.search;
    else if (pathname.includes("/login")) targetUrl = WEBHOOKS.login + url.search;
    else if (pathname.includes("/signup")) targetUrl = WEBHOOKS.signup + url.search;
    else if (pathname.includes("/delete")) targetUrl = WEBHOOKS.delete + url.search;
    else if (pathname.includes("/contact")) targetUrl = WEBHOOKS.contact + url.search;
    else if (pathname.includes("/verify")) targetUrl = WEBHOOKS.verify + url.search;
    else if (pathname.includes("/forgot-password-request")) targetUrl = WEBHOOKS.forgot_req + url.search;
    else if (pathname.includes("/forgot-password-reset")) targetUrl = WEBHOOKS.forgot_res + url.search;

    if (!targetUrl) return new Response("Not Found", { status: 404, headers: corsHeaders });

    // --- LOGIC CHẶN KHÁCH DÙNG KV ---
    const isGuest = request.headers.get("X-Guest-Mode") === "true";
    if (pathname.includes("/chat") && request.method === "POST" && isGuest) {
      const clientIP = request.headers.get("cf-connecting-ip") || "unknown";
      if (env.RATE_LIMITER) {
        let count = await env.RATE_LIMITER.get(clientIP) || 0;
        count = parseInt(count);

        if (count >= 3) {
          return new Response(JSON.stringify({
            output: "Bạn đã hết lượt dùng thử. Hệ thống sẽ tự động đăng xuất.",
            limitReached: true // Gửi tín hiệu để HTML tự logout
          }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        await env.RATE_LIMITER.put(clientIP, (count + 1).toString(), { expirationTtl: 86400 });
      }
    }

    // Forward request đến n8n
    const n8nResponse = await fetch(targetUrl, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: (request.method !== "GET") ? await request.text() : null
    });

    return new Response(await n8nResponse.text(), {
      status: n8nResponse.status,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
