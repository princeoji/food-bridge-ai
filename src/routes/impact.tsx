import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { ImpactStats } from "@/components/ImpactStats";
import { Cta } from "./index";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Our Impact — FoodBridge" },
      {
        name: "description",
        content: "Community totals for delivered meals, food partners and NGOs on FoodBridge.",
      },
      { property: "og:title", content: "Our Impact — FoodBridge" },
      { property: "og:description", content: "Making a difference, one meal at a time." },
    ],
  }),
  component: Impact,
});

function Impact() {
  return (
    <SiteLayout>
      <PageHero
        title={
          <>
            Our <span className="text-primary">Impact</span>
          </>
        }
        sub="Meals confirmed delivered, food shared, and partners working together to feed their communities."
      />
      <section className="px-[5%] lg:px-[7%] py-9">
        <ImpactStats />
      </section>
      <Cta />
    </SiteLayout>
  );
}
