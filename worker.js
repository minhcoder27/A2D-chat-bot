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
      chat: "https://n8n.a2dzespol.pl/webhook/d8451693-0079-4da7-b3a3-ec1561bd2da3",
      delete: "https://n8n.a2dzespol.pl/webhook/7e75278a-2bc2-4832-b601-39085570f7aa",
      contact: "https://n8n.a2dzespol.pl/webhook/366a0816-3157-4425-9bb5-5aa258c94161",
      google: "https://n8n.a2dzespol.pl/webhook/1bb050cf-1320-400d-823b-1dd76ac4daae",
      login: "https://n8n.a2dzespol.pl/webhook/3349af0f-ead6-4ba5-a535-f9c993b8fe19",
      signup: "https://n8n.a2dzespol.pl/webhook/f8f58561-ed9e-4a49-b273-7776ba9073a3",
      verify: "https://n8n.a2dzespol.pl/webhook/e05cd05b-f854-48ca-bc15-ca75ca32edf9",
      forgot_req: "https://n8n.a2dzespol.pl/webhook/6695aa05-2a9c-4abb-8c9b-28188af236ee",
      forgot_res: "https://n8n.a2dzespol.pl/webhook/431e1515-154b-4545-b60b-edebc54b47a8",
      problem_status_residency: "https://n8n.a2dzespol.pl/webhook/79e7d4cc-2b54-49ff-9d80-aa0834cdcdbe",
      problem_status_labor: "https://n8n.a2dzespol.pl/webhook/ef1d55c7-a4b5-41b3-a559-bb2bf127db52",
      problem_status_tax: "https://n8n.a2dzespol.pl/webhook/a1998a42-a743-4965-993e-e0eb97b36244",
      problem_status_insurance: "https://n8n.a2dzespol.pl/webhook/5a51ee16-917b-4717-9fcb-1804bf922602"
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
    else if (pathname.includes("/problem-status-residency")) targetUrl = WEBHOOKS.problem_status_residency + url.search;
    else if (pathname.includes("/problem-status-labor")) targetUrl = WEBHOOKS.problem_status_labor + url.search;
    else if (pathname.includes("/problem-status-tax")) targetUrl = WEBHOOKS.problem_status_tax + url.search;
    else if (pathname.includes("/problem-status-insurance")) targetUrl = WEBHOOKS.problem_status_insurance + url.search;

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
