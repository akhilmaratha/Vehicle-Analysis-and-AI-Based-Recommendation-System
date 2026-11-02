import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";

const requirements = {
  budget: "₹15 Lakh",
  fuel: "Petrol",
  transmission: "Automatic",
  priority: "Mileage + Safety",
};

const recommendations = [
  {
    id: 1,
    brand: "Vehicle",
    model: "A",
    price: 1450000,
    fuel_type: "Petrol",
    transmission: "Automatic",
    mileage: 17.4,
    match_percentage: 94,
    reason: "Placeholder: strong mileage and safety fit for your priorities.",
  },
  {
    id: 2,
    brand: "Vehicle",
    model: "B",
    price: 1380000,
    fuel_type: "Petrol",
    transmission: "Automatic",
    mileage: 18.1,
    match_percentage: 89,
    reason: "Placeholder: balanced price and feature set.",
  },
  {
    id: 3,
    brand: "Vehicle",
    model: "C",
    price: 1520000,
    fuel_type: "Hybrid",
    transmission: "Automatic",
    mileage: 22.5,
    match_percentage: 86,
    reason: "Placeholder: high efficiency option within budget range.",
  },
];

export default function RecommendationsPage() {
  return (
    <div className="page-container space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Recommendations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Placeholder results. Ranking will be powered by scikit-learn later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Budget: {requirements.budget}</p>
          <p>Fuel: {requirements.fuel}</p>
          <p>Transmission: {requirements.transmission}</p>
          <p>Priority: {requirements.priority}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Recommended Vehicles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((item, index) => (
            <div key={item.id} className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {index + 1}. {item.brand} {item.model}
              </p>
              <RecommendationCard recommendation={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
