export default function robots() {
  const baseUrl = "https://riohoki.my.id";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
