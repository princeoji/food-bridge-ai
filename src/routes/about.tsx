import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Cta } from "./index";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — FoodHope" },
      { name: "description", content: "Why FoodHope exists: ending food waste and hunger by linking hotels with NGOs." },
      { property: "og:title", content: "About Us — FoodHope" },
      { property: "og:description", content: "Our mission to end food waste and hunger." },
    ],
  }),
  component: About,
});

const values = [
  { t: "Our Mission", d: "Make sure every good meal that would be thrown away reaches someone who is hungry." },
  { t: "Our Vision", d: "A world where no food goes to waste and no child sleeps hungry." },
  { t: "Our Promise", d: "Simple, transparent and safe food sharing between trusted partners." },
];

function About() {
  return (
    <SiteLayout>
      <PageHero title={<>About <span className="text-primary">FoodHope</span></>} sub="Every day tonnes of fresh food are wasted while many go hungry. We built FoodHope to bridge that gap." />
      <section className="px-[5%] lg:px-[10%] py-12 grid md:grid-cols-3 gap-6">
        {values.map((v) => (
          <div key={v.t} className="card-box p-6"><h3 className="text-xl font-bold text-primary mb-2">{v.t}</h3><p className="text-muted-foreground leading-relaxed">{v.d}</p></div>
        ))}
      </section>
      <section className="px-[5%] lg:px-[10%] pb-12 max-w-4xl mx-auto text-muted-foreground leading-relaxed space-y-4">
        <p>Hotels, restaurants and caterers list their surplus food on FoodHope in under a minute. Nearby NGOs see it instantly, claim it, and pick it up before it spoils.</p>
        <p>Every claimed donation is counted towards our impact, so partners can see the real difference they are making.</p>
      </section>
      <Cta />
    </SiteLayout>
  );
}
