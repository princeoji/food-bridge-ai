import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHeart, HeartHandshake, Store, Truck, Users } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { ImpactStats } from "@/components/ImpactStats";
import { FoodSharingIllustration } from "@/components/FoodSharingIllustration";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FoodBridge — Feed Hope, Not Waste" },
      {
        name: "description",
        content:
          "FoodBridge connects hotels and restaurants with surplus food to NGOs and communities in need.",
      },
      { property: "og:title", content: "FoodBridge — Feed Hope, Not Waste" },
      {
        property: "og:description",
        content: "Donate surplus food or claim it for your community with FoodBridge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

export const steps = [
  {
    n: 1,
    icon: HandHeart,
    title: "Donate",
    text: "Restaurants and hotels list surplus food with a pickup address and best-before time.",
  },
  {
    n: 2,
    icon: Truck,
    title: "Pickup",
    text: "An NGO claims food with a delivery address. A volunteer accepts and collects it using the pickup code.",
  },
  {
    n: 3,
    icon: Users,
    title: "Distribute",
    text: "The hotel confirms pickup, then the volunteer delivers to the NGO and marks the order delivered.",
  },
];

export function Steps() {
  return (
    <div className="grid md:grid-cols-3 gap-6 pt-4">
      {steps.map(({ n, icon: Icon, title, text }) => (
        <div key={n} className="grid grid-cols-[78px_1fr] gap-4 items-center">
          <div className="relative w-[70px] h-[70px] rounded-full bg-accent text-primary flex items-center justify-center">
            <span className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold">
              {n}
            </span>
            <Icon className="size-8" aria-hidden="true" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Cta() {
  return (
    <div className="text-center bg-primary text-primary-foreground px-[5%] py-6">
      <h2 className="text-3xl font-extrabold mb-2">Ready to Make a Difference?</h2>
      <p className="text-lg mb-3">Whether you're a food provider or an NGO, every action counts</p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Link to="/signup" className="btn gap-2">
          <Store className="size-4" aria-hidden="true" />
          Start Donating
        </Link>
        <Link to="/signup" className="btn btn-red gap-2 border-primary-foreground">
          <HeartHandshake className="size-4" aria-hidden="true" />
          Join as NGO
        </Link>
      </div>
    </div>
  );
}

function Home() {
  return (
    <SiteLayout>
      <div className="grid md:grid-cols-[1fr_1.15fr] gap-6 lg:gap-8 items-center px-[5%] lg:px-[7%] py-6 md:py-8 bg-secondary">
        <div>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.05] mb-3">
            Feed Hope,
            <br />
            <span className="text-primary">Not Waste</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mb-4">
            Join us in creating a world where no food goes to waste and no child goes hungry.
            Together, we connect generous food providers with those who need it most.
          </p>
          <div className="flex gap-3 flex-wrap mb-4">
            <Link to="/signup" className="btn btn-red gap-2">
              <HandHeart className="size-4" aria-hidden="true" />
              Donate Food
            </Link>
            <Link to="/signup" className="btn gap-2">
              <Users className="size-4" aria-hidden="true" />
              Join as NGO
            </Link>
          </div>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-primary font-extrabold py-2"
          >
            Know Our Work <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="w-full max-w-2xl mx-auto">
          <FoodSharingIllustration />
        </div>
      </div>
      <section className="px-[5%] lg:px-[7%] py-8">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-extrabold mb-2">Our Impact</h2>
          <p className="text-muted-foreground">Making a difference, one meal at a time</p>
        </div>
        <ImpactStats />
      </section>
      <section className="px-[5%] lg:px-[7%] py-8">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-extrabold mb-2">How It Works</h2>
          <p className="text-muted-foreground">Simple steps to make a big impact</p>
        </div>
        <Steps />
      </section>
      <Cta />
    </SiteLayout>
  );
}
