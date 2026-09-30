import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { ImpactStats } from "@/components/ImpactStats";
import hero from "@/assets/hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FoodHope — Feed Hope, Not Waste" },
      { name: "description", content: "FoodHope connects hotels and restaurants with surplus food to NGOs and communities in need." },
      { property: "og:title", content: "FoodHope — Feed Hope, Not Waste" },
      { property: "og:description", content: "Donate surplus food or claim it for your community with FoodHope." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

export const steps = [
  { n: 1, icon: "♡", title: "Donate", text: "Restaurants and hotels register surplus food for donation." },
  { n: 2, icon: "▣", title: "Pickup", text: "NGOs and volunteers claim and collect the food at scheduled times." },
  { n: 3, icon: "♙", title: "Distribute", text: "Food reaches orphanages and underprivileged communities." },
];

export function Steps() {
  return (
    <div className="grid md:grid-cols-3 gap-10 pt-4">
      {steps.map((s) => (
        <div key={s.n} className="grid grid-cols-[90px_1fr] gap-4 items-center">
          <div className="relative w-[78px] h-[78px] rounded-full bg-accent text-primary flex items-center justify-center text-3xl">
            <span className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-extrabold">{s.n}</span>
            {s.icon}
          </div>
          <div><h3 className="font-bold text-lg mb-2">{s.title}</h3><p className="text-muted-foreground leading-relaxed">{s.text}</p></div>
        </div>
      ))}
    </div>
  );
}

export function Cta() {
  return (
    <div className="text-center bg-primary text-primary-foreground px-[5%] py-10">
      <h2 className="text-3xl font-extrabold mb-2">Ready to Make a Difference?</h2>
      <p className="text-lg mb-5">Whether you're a food provider or an NGO, every action counts</p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Link to="/signup" className="btn">Start Donating</Link>
        <Link to="/signup" className="btn btn-red border-primary-foreground">Join as NGO</Link>
      </div>
    </div>
  );
}

function Home() {
  return (
    <SiteLayout>
      <div className="grid md:grid-cols-[1fr_1.15fr] gap-12 items-center px-[5%] lg:px-[10%] py-10 bg-secondary">
        <div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.05] mb-5">Feed Hope,<br /><span className="text-primary">Not Waste</span></h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mb-6">Join us in creating a world where no food goes to waste and no child goes hungry. Together, we connect generous food providers with those who need it most.</p>
          <div className="flex gap-3 flex-wrap mb-6">
            <Link to="/signup" className="btn btn-red">Donate Food</Link>
            <Link to="/get-involved" className="btn">Join as Volunteer</Link>
          </div>
          <Link to="/about" className="text-primary font-extrabold">Know Our Work →</Link>
        </div>
        <img src={hero} alt="Volunteers sharing meals with children" className="w-full h-[380px] object-cover object-top rounded-2xl shadow-[0_8px_20px_rgba(16,24,40,.16)]" />
      </div>
      <section className="px-[5%] lg:px-[10%] py-12">
        <div className="text-center mb-6"><h2 className="text-3xl font-extrabold mb-2">Our Impact</h2><p className="text-muted-foreground">Making a difference, one meal at a time</p></div>
        <ImpactStats />
      </section>
      <section className="px-[5%] lg:px-[10%] py-12">
        <div className="text-center mb-6"><h2 className="text-3xl font-extrabold mb-2">How It Works</h2><p className="text-muted-foreground">Simple steps to make a big impact</p></div>
        <Steps />
      </section>
      <Cta />
    </SiteLayout>
  );
}
