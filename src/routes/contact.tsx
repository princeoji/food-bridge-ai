import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — FoodHope" },
      { name: "description", content: "Get in touch with the FoodHope team." },
      { property: "og:title", content: "Contact — FoodHope" },
      { property: "og:description", content: "Questions or partnerships? Reach out to FoodHope." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <SiteLayout>
      <PageHero title={<>Contact <span className="text-primary">Us</span></>} sub="Questions, partnerships or feedback — we'd love to hear from you." />
      <section className="px-[5%] lg:px-[10%] py-14 grid md:grid-cols-2 gap-8">
        <div className="space-y-4 text-muted-foreground">
          <p><strong className="text-foreground">Email:</strong> hello@foodhope.org</p>
          <p><strong className="text-foreground">Phone:</strong> +91 00000 00000</p>
          <p><strong className="text-foreground">Hours:</strong> Mon–Sat, 9am – 7pm</p>
        </div>
        {sent ? (
          <div className="card-box p-8 text-center"><h3 className="text-xl font-bold text-primary mb-2">Thank you!</h3><p className="text-muted-foreground">Your message has been noted. We'll reply soon.</p></div>
        ) : (
          <form className="card-box p-7 grid gap-3" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <input className="field" placeholder="Your name" required />
            <input className="field" type="email" placeholder="Email" required />
            <textarea className="field" placeholder="Message" required />
            <button className="btn btn-red">Send Message</button>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}
