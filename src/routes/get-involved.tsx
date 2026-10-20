import { createFileRoute, Link } from "@tanstack/react-router";
import { HandHeart, HeartHandshake, Megaphone } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";

export const Route = createFileRoute("/get-involved")({
  head: () => ({
    meta: [
      { title: "Get Involved — FoodBridge" },
      {
        name: "description",
        content: "Join FoodBridge as a hotel donor or an NGO partner and help feed communities.",
      },
      { property: "og:title", content: "Get Involved — FoodBridge" },
      { property: "og:description", content: "Donate food or join as an NGO partner." },
    ],
  }),
  component: Involved,
});

const ways = [
  {
    icon: HandHeart,
    t: "Donate Food",
    d: "Create a Hotel account for your hotel, restaurant or caterer and share surplus meals.",
    to: "/signup",
    action: "Register as a Food Partner",
  },
  {
    icon: HeartHandshake,
    t: "Partner as NGO",
    d: "Register your NGO, claim available food and arrange collection for the people you serve.",
    to: "/signup",
    action: "Register Your NGO",
  },
  {
    icon: Megaphone,
    t: "Volunteer to Deliver",
    d: "Create a Volunteer account, accept a food delivery, collect it using the pickup code, and bring it to the NGO.",
    to: "/signup",
    action: "Join as a Volunteer",
  },
] as const;

function Involved() {
  return (
    <SiteLayout>
      <PageHero
        title={
          <>
            Get <span className="text-primary">Involved</span>
          </>
        }
        sub="There's a place for everyone in the fight against hunger."
      />
      <section className="px-[5%] lg:px-[7%] py-9 grid md:grid-cols-3 gap-4">
        {ways.map(({ icon: Icon, t, d, to, action }) => (
          <div key={t} className="card-box p-4 text-center flex flex-col items-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent text-primary flex items-center justify-center mb-3">
              <Icon className="size-8" aria-hidden="true" strokeWidth={1.8} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t}</h3>
            <p className="text-muted-foreground mb-3 leading-relaxed">{d}</p>
            <Link to={to} className="btn btn-red mt-auto">
              {action}
            </Link>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
