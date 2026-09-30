import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";

export const Route = createFileRoute("/get-involved")({
  head: () => ({
    meta: [
      { title: "Get Involved — FoodHope" },
      { name: "description", content: "Join FoodHope as a hotel donor or an NGO partner and help feed communities." },
      { property: "og:title", content: "Get Involved — FoodHope" },
      { property: "og:description", content: "Donate food or join as an NGO partner." },
    ],
  }),
  component: Involved,
});

const ways = [
  { icon: "♡", t: "Donate Food", d: "Hotels, restaurants and caterers can list surplus meals in seconds." },
  { icon: "♙", t: "Partner as NGO", d: "Claim fresh food for the people you serve every day." },
  { icon: "♢", t: "Spread the Word", d: "Tell a restaurant owner or NGO near you about FoodHope." },
];

function Involved() {
  return (
    <SiteLayout>
      <PageHero title={<>Get <span className="text-primary">Involved</span></>} sub="There's a place for everyone in the fight against hunger." />
      <section className="px-[5%] lg:px-[10%] py-14 grid md:grid-cols-3 gap-6">
        {ways.map((w) => (
          <div key={w.t} className="card-box p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent text-primary flex items-center justify-center text-3xl mb-3">{w.icon}</div>
            <h3 className="text-xl font-bold mb-2">{w.t}</h3>
            <p className="text-muted-foreground mb-4">{w.d}</p>
            <Link to="/signup" className="btn btn-red">Join Now</Link>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
