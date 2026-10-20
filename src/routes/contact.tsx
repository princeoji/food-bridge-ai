import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { HandHeart, MessageCircle } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/donations";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — FoodBridge" },
      { name: "description", content: "Get in touch with the FoodBridge team." },
      { property: "og:title", content: "Contact — FoodBridge" },
      {
        property: "og:description",
        content: "Questions or partnerships? Reach out to FoodBridge.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submitting = useRef(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    setErr("");
    if (name.length < 2 || name.length > 120) {
      setErr("Enter a name between 2 and 120 characters.");
      return;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (message.length < 10 || message.length > 5000) {
      setErr("Write a message between 10 and 5,000 characters.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("submit_contact_message", {
        p_name: name,
        p_email: email,
        p_message: message,
      });
      if (error) throw error;
      if (data !== true)
        throw new Error("We could not save your message. Please wait a moment and try again.");
      setSent(true);
    } catch (error) {
      setErr(errorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <PageHero
        title={
          <>
            Contact <span className="text-primary">Us</span>
          </>
        }
        sub="Questions, partnerships or feedback — we'd love to hear from you."
      />
      <section className="px-[5%] lg:px-[7%] py-9 grid md:grid-cols-2 gap-6 lg:gap-8">
        <div className="space-y-4">
          <div>
            <MessageCircle className="size-9 text-primary mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-3">Let’s make food go further</h2>
            <p className="text-muted-foreground leading-relaxed">
              Have an idea for a partnership, a question about FoodBridge, or feedback about your
              experience? Leave a message for the FoodBridge team.
            </p>
          </div>
          <div className="card-box p-4">
            <HandHeart className="size-7 text-primary mb-3" aria-hidden="true" />
            <h3 className="font-bold text-lg mb-2">Arranging a food pickup?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use your dashboard to list or claim food. After a claim, your donation partner’s
              contact details are available there so you can arrange pickup directly.
            </p>
            <Link to="/dashboard" className="btn mt-4">
              Go to Dashboard
            </Link>
          </div>
        </div>
        {sent ? (
          <div className="card-box p-5 sm:p-5 self-start grid gap-4">
            <h2 className="text-2xl font-bold text-primary">Thank you for reaching out</h2>
            <p role="status" className="text-muted-foreground">
              Your message has been saved for the FoodBridge team to review.
            </p>
            <button type="button" className="btn" onClick={() => setSent(false)}>
              Write Another Message
            </button>
          </div>
        ) : (
          <form
            className="card-box p-4 sm:p-5 grid gap-3 self-start"
            onSubmit={submit}
            aria-busy={busy}
          >
            <h2 className="text-2xl font-bold">Send a message</h2>
            <label className="grid gap-1.5 text-sm font-bold" htmlFor="contact-name">
              Your name
              <input
                id="contact-name"
                className="field font-normal"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                disabled={busy}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold" htmlFor="contact-email">
              Email
              <input
                id="contact-email"
                className="field font-normal"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={busy}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold" htmlFor="contact-message">
              Message
              <textarea
                id="contact-message"
                className="field font-normal min-h-24 resize-y"
                name="message"
                minLength={10}
                maxLength={5000}
                rows={5}
                required
                disabled={busy}
                aria-describedby="contact-privacy"
              />
            </label>
            <p id="contact-privacy" className="text-xs text-muted-foreground">
              Your name, email and message are saved so the team can review your enquiry. Please
              avoid sharing passwords or other sensitive information.
            </p>
            {err && (
              <p role="alert" className="text-sm text-destructive">
                {err}
              </p>
            )}
            <button type="submit" className="btn btn-red" disabled={busy}>
              {busy ? "Saving message…" : "Send Message"}
            </button>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}
