import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

const eventCategories = [
  {
    title: "Day Coordination Only",
    description: "Standalone Service — Already planned? We'll run the day for you",
    subcategories: [],
    value: "day-coordination",
  },
  {
    title: "Wedding",
    description: "Traditional, destination, civil ceremonies, engagement parties, bridal showers, and vow renewals.",
    subcategories: ["Traditional", "Destination", "Civil Ceremony", "Reception"],
    value: "wedding",
  },
  {
    title: "Corporate",
    description: "Conferences, seminars, product launches, galas, team building, exhibitions, and business events.",
    subcategories: ["Conference", "Gala", "Product Launch", "Team Building"],
    value: "corporate",
  },
  {
    title: "Celebration",
    description: "Birthdays, anniversaries, graduations, baby showers, retirement parties, and family reunions.",
    subcategories: ["Birthday", "Anniversary", "Baby Shower", "Graduation", "Children's Party"],
    value: "celebration",
  },
  {
    title: "Children's Party",
    description: "Themed parties, pool parties, garden parties, arts & crafts, sports days, and carnival fun fairs.",
    subcategories: ["Themed Party", "Pool Party", "Sports Party", "Carnival"],
    value: "childrens-party",
  },
  {
    title: "Entertainment & Ticketing",
    description: "Concerts, exhibitions, festivals, theatre shows, comedy nights, fashion shows, and ticketed events.",
    subcategories: ["Concert", "Exhibition", "Festival", "Theatre"],
    value: "entertainment",
  },
];

export default function EventTypeSelection() {
  const [, setLocation] = useLocation();

  const handleSelectCategory = (categoryValue: string, subcategory?: string) => {
    const params = new URLSearchParams();
    params.set("eventType", categoryValue);
    if (subcategory) params.set("subtype", subcategory);
    setLocation(`/booking-enquiry?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <img src={logoPath} alt="Event Perfekt" className="h-10 w-auto cursor-pointer hover:opacity-80" />
          </Link>
          <h2 className="text-lg font-semibold text-[#330311]">Create New Event</h2>
          <div className="w-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#330311] mb-3">What type of event are you planning?</h1>
          <p className="text-gray-600 text-lg">Choose the category that best fits your event</p>
        </div>

        {/* Categories */}
        <div className="space-y-8">
          {eventCategories.map((category) => (
            <div key={category.value} className="border-b border-gray-200 pb-8 last:border-b-0">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-[#330311] mb-1">{category.title}</h3>
                <p className="text-gray-600 text-sm">{category.description}</p>
              </div>

              {category.subcategories.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {category.subcategories.map((sub) => (
                    <Button
                      key={sub}
                      variant="outline"
                      className="border-[#330311] text-[#330311] hover:bg-[#330311] hover:text-white"
                      onClick={() => handleSelectCategory(category.value, sub)}
                    >
                      {sub}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button
                  className="bg-[#8B1538] text-white hover:bg-[#330311]"
                  onClick={() => handleSelectCategory(category.value)}
                >
                  Get Started
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-gray-600 text-sm">
          <p>Event Perfekt — Making yours perfekt</p>
        </div>
      </div>
    </div>
  );
}
