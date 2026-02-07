const DEFAULT_CURRENCY = "INR";

export const formatCurrency = (value: number, currency: string = DEFAULT_CURRENCY) =>
  value.toLocaleString("en-IN", { style: "currency", currency });

export const classNames = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(" ");

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const formatDate = (value: string | number | Date) =>
  new Date(value).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export const formatDateTime = (value: string | number | Date) =>
  new Date(value).toLocaleString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const markdownToHtml = (value: string) => {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*(.+?)\*/g, "<em>$1</em>");
  const withLines = withItalic.replace(/(^|\n)-\s+(.*)/g, "$1<li>$2</li>");
  const wrappedLists = withLines.replace(
    /(<li>[\s\S]*?<\/li>)/g,
    "<ul class=\"list-disc pl-5 space-y-1 text-sm text-gray-700\">$1</ul>"
  );
  return wrappedLists.replace(/\n/g, "<br />");
};

const sanitizeDescriptionHtml = (value: string) => {
  let normalized = value
    .replace(/<\s*div\b[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*div>/gi, "</p>")
    .replace(/<\s*span\b[^>]*>/gi, "")
    .replace(/<\s*\/\s*span>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "<br />")
    .replace(/<\s*script[\s\S]*?<\/script>/gi, "")
    .replace(/<\s*style[\s\S]*?<\/style>/gi, "");

  const allowed = new Set(["b", "strong", "i", "em", "u", "s", "p", "br", "ul", "ol", "li"]);

  normalized = normalized.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag) => {
    const lower = String(tag).toLowerCase();
    if (!allowed.has(lower)) return "";
    if (lower === "br") return "<br />";
    return match.startsWith("</") ? `</${lower}>` : `<${lower}>`;
  });

  return normalized;
};

export const renderDescriptionHtml = (value: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  return looksLikeHtml ? sanitizeDescriptionHtml(trimmed) : markdownToHtml(trimmed);
};
