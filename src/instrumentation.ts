export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Neon's HTTP driver uses Node's fetch (undici). On networks with broken/slow
    // IPv6 routing, undici's Happy Eyeballs can pick the IPv6 address, stall, and
    // surface as an intermittent "TypeError: fetch failed" — prefer IPv4 to avoid it.
    const { setDefaultResultOrder } = await import("node:dns");
    setDefaultResultOrder("ipv4first");
  }
}
