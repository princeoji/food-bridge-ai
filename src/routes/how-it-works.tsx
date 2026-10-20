import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Steps, Cta } from "./index";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — FoodBridge" },
      {
        name: "description",
        content:
          "Donate, pickup, distribute: how surplus food moves from hotels to NGOs on FoodBridge.",
      },
      { property: "og:title", content: "How It Works — FoodBridge" },
      { property: "og:description", content: "Three simple steps from surplus to served." },
    ],
  }),
  component: How,
});

function How() {
  return (
    <SiteLayout>
      <PageHero
        title={
          <>
            How It <span className="text-primary">Works</span>
          </>
        }
        sub="Simple steps to make a big impact"
      />
      <section className="px-[5%] lg:px-[7%] py-9">
        <Steps />
      </section>
      <section className="px-[5%] lg:px-[7%] pb-9 grid md:grid-cols-3 gap-4">
        <div className="card-box p-4">
          <h3 className="text-xl font-bold mb-3">For Hotels & Restaurants</h3>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2">
            <li>Create a Hotel account for your hotel, restaurant or catering business</li>
            <li>List the food, meal quantity, pickup address and best-before time</li>
            <li>
              Find the order by its six-digit code, verify the assigned volunteer, and mark it
              picked up
            </li>
          </ul>
        </div>
        <div className="card-box p-4">
          <h3 className="text-xl font-bold mb-3">For NGOs</h3>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2">
            <li>Create an NGO account with your serving capacity</li>
            <li>Browse food in your dashboard and check the pickup address and best-before time</li>
            <li>Claim a donation and enter your NGO's delivery address</li>
            <li>Track pickup and delivery, then distribute the received food</li>
          </ul>
        </div>
        <div className="card-box p-4">
          <h3 className="text-xl font-bold mb-3">For Volunteers</h3>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2">
            <li>Create a Volunteer account and accept an available delivery</li>
            <li>Show the pickup code to the hotel and wait for pickup confirmation</li>
            <li>Deliver the food to the NGO and finish delivery in your dashboard</li>
          </ul>
        </div>
      </section>
      <Cta />
    </SiteLayout>
  );
}
