import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { ImpactStats } from "@/components/ImpactStats";
import { Cta } from "./index";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Our Impact — FoodHope" },
      { name: "description", content: "Live numbers: meals served, food partners and NGOs on FoodHope." },
      { property: "og:title", content: "Our Impact — FoodHope" },
      { property: "og:description", content: "Making a difference, one meal at a time." },
    ],
  }),
  component: Impact,
});

function Impact() {
  return (
    <SiteLayout>
      <PageHero title={<>Our <span className="text-primary">Impact</span></>} sub="Live numbers from our community, updated as every donation is claimed." />
      <section className="px-[5%] lg:px-[10%] py-14"><ImpactStats /></section>
      <Cta />
    </SiteLayout>
  );
}
