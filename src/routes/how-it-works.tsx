import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Steps, Cta } from "./index";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — FoodHope" },
      { name: "description", content: "Donate, pickup, distribute: how surplus food moves from hotels to NGOs on FoodHope." },
      { property: "og:title", content: "How It Works — FoodHope" },
      { property: "og:description", content: "Three simple steps from surplus to served." },
    ],
  }),
  component: How,
});

function How() {
  return (
    <SiteLayout>
      <PageHero title={<>How It <span className="text-primary">Works</span></>} sub="Simple steps to make a big impact" />
      <section className="px-[5%] lg:px-[10%] py-14"><Steps /></section>
      <section className="px-[5%] lg:px-[10%] pb-14 grid md:grid-cols-2 gap-6">
        <div className="card-box p-6"><h3 className="text-xl font-bold mb-3">For Hotels & Restaurants</h3>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2"><li>Sign up as a Hotel</li><li>List food name, quantity, pickup address and best-before time</li><li>Get notified in your dashboard when an NGO claims it</li></ul></div>
        <div className="card-box p-6"><h3 className="text-xl font-bold mb-3">For NGOs</h3>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2"><li>Sign up as an NGO with your serving capacity</li><li>Browse available food in your dashboard</li><li>Claim, pick up and mark it delivered</li></ul></div>
      </section>
      <Cta />
    </SiteLayout>
  );
}
