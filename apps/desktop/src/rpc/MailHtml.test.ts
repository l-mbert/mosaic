import { assert, describe, it } from "@effect/vitest";

import { sanitizeMailHtml } from "./MailHtml.ts";

describe("mail HTML sanitization", () => {
  it("removes scripts, event handlers, remote images, and unsafe links", () => {
    const sanitized = sanitizeMailHtml(
      '<p onclick="alert(1)">Hello <strong>Mosaic</strong></p>' +
        '<script>alert("bad")</script>' +
        '<img src="https://tracking.test/pixel" onerror="alert(1)">' +
        '<a href="javascript:alert(1)">unsafe</a>' +
        '<a href="https://mosaic.test/docs">safe</a>',
    );

    assert(sanitized.includes("<strong>Mosaic</strong>"));
    assert(sanitized.includes('href="https://mosaic.test/docs"'));
    assert(!sanitized.includes("onclick"));
    assert(!sanitized.includes("script"));
    assert(!sanitized.includes("<img"));
    assert(!sanitized.includes("javascript:"));
  });
});
