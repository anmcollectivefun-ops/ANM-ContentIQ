import Link from "next/link";

export const metadata = {
  title: "oEmbed Demo — ANM ContentIQ",
  description:
    "Demo page showing how ANM ContentIQ uses oEmbed previews for public social content.",
};

export default function OEmbedDemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1020",
        color: "#ffffff",
        padding: "48px 22px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              color: "#ffffff",
              textDecoration: "none",
            }}
          >
            <img
              src="/ANM_ContentIQ_.JPG"
              alt="ANM ContentIQ"
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                objectFit: "cover",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                ANM ContentIQ
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "rgba(255,255,255,.56)",
                  fontSize: 12,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                oEmbed demo
              </div>
            </div>
          </Link>

          <Link
            href="/privacy"
            style={{
              color: "rgba(255,255,255,.72)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Privacy Policy
          </Link>
        </header>

        <section
          style={{
            background: "rgba(255,255,255,.055)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 24px 80px rgba(0,0,0,.35)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#D8B4FE",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Meta App Review Demo
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 6vw, 58px)",
              lineHeight: 0.98,
              maxWidth: 780,
            }}
          >
            oEmbed previews for public social content
          </h1>

          <p
            style={{
              margin: "18px 0 0",
              color: "rgba(255,255,255,.72)",
              fontSize: 16,
              lineHeight: 1.75,
              maxWidth: 820,
            }}
          >
            ANM ContentIQ uses oEmbed Read to display embedded previews of
            public Facebook, Instagram or Threads content inside a user's
            private content workspace. Users can paste public post URLs and save
            those examples as research, inspiration and planning material for
            their own original content.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              title: "1. User pastes a public URL",
              text: "The user adds a public Facebook, Instagram or Threads post URL to their private workspace.",
            },
            {
              title: "2. ContentIQ displays a preview",
              text: "The app uses oEmbed to show a public embedded preview without accessing private content.",
            },
            {
              title: "3. User plans original content",
              text: "The preview is used for inspiration, research, format comparison and content planning.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 22,
                padding: 20,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.2,
                }}
              >
                {item.title}
              </h2>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "rgba(255,255,255,.68)",
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </section>

        <section
          style={{
            background: "rgba(255,255,255,.055)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 28,
            padding: 24,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 26,
            }}
          >
            Example test area
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: "rgba(255,255,255,.68)",
              lineHeight: 1.7,
            }}
          >
            In the production workspace, this area displays the embedded preview
            returned by oEmbed for a public post URL provided by the user. For
            review purposes, this page explains the user flow and the intended
            use of the permission.
          </p>

          <div
            style={{
              border: "1px dashed rgba(216,180,254,.55)",
              borderRadius: 22,
              padding: 22,
              background: "rgba(216,180,254,.08)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#D8B4FE",
                fontWeight: 900,
              }}
            >
              Public post preview placeholder
            </p>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,.72)",
                lineHeight: 1.7,
              }}
            >
              A reviewer can test this use case by providing a public Threads,
              Facebook or Instagram post URL. The app will use oEmbed only to
              display the public preview inside the user's workspace.
            </p>
          </div>
        </section>

        <section
          style={{
            background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.28)",
            borderRadius: 24,
            padding: 22,
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              color: "#FCA5A5",
              fontSize: 22,
            }}
          >
            What ANM ContentIQ does not do
          </h2>

          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              color: "rgba(255,255,255,.72)",
              lineHeight: 1.8,
            }}
          >
            <li>It does not access private content.</li>
            <li>It does not scrape private user data.</li>
            <li>It does not republish embedded content automatically.</li>
            <li>It does not post anything without user action.</li>
            <li>It does not use oEmbed to identify private users.</li>
          </ul>
        </section>

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: 12,
            color: "rgba(255,255,255,.52)",
            fontSize: 13,
          }}
        >
          <span>ANM ContentIQ by ANM Collective sp. z o.o.</span>

          <span style={{ display: "inline-flex", gap: 14 }}>
            <Link
              href="/privacy"
              style={{ color: "rgba(255,255,255,.72)", textDecoration: "none" }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              style={{ color: "rgba(255,255,255,.72)", textDecoration: "none" }}
            >
              Terms of Service
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}