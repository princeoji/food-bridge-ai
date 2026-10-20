import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Cta } from "./index";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — FoodBridge" },
      {
        name: "description",
        content: "Why FoodBridge exists: ending food waste and hunger by linking hotels with NGOs.",
      },
      { property: "og:title", content: "About Us — FoodBridge" },
      { property: "og:description", content: "Our mission to end food waste and hunger." },
    ],
  }),
  component: About,
});

const values = [
  {
    t: "Our Mission",
    d: "Make sure every good meal that would be thrown away reaches someone who is hungry.",
  },
  { t: "Our Vision", d: "A world where no food goes to waste and no child sleeps hungry." },
  {
    t: "Our Promise",
    d: "Clear donation details and direct contact between food providers and NGOs.",
  },
];

function About() {
  return (
    <SiteLayout>
      <PageHero
        title={
          <>
            About <span className="text-primary">FoodBridge</span>
          </>
        }
        sub="Every day tonnes of fresh food are wasted while many go hungry. We built FoodBridge to bridge that gap."
      />
      <section className="px-[5%] lg:px-[7%] py-8 grid md:grid-cols-3 gap-4">
        {values.map((v) => (
          <div key={v.t} className="card-box p-4">
            <h3 className="text-xl font-bold text-primary mb-2">{v.t}</h3>
            <p className="text-muted-foreground leading-relaxed">{v.d}</p>
          </div>
        ))}
      </section>
      <section className="px-[5%] lg:px-[7%] pb-12 max-w-4xl mx-auto text-muted-foreground leading-relaxed space-y-3">
        <p>
          Hotels, restaurants and caterers list surplus food with its quantity, pickup address and
          best-before time. NGOs claim food and provide a delivery address. Volunteers accept
          deliveries and show the six-digit pickup code to the hotel.
        </p>
        <p>
          The hotel confirms pickup, then the assigned volunteer confirms delivery to the NGO. Those
          completed donations count towards our delivered meals, so our community can follow the
          difference it makes.
        </p>
      </section>
      <Cta />
    </SiteLayout>
  );
}
