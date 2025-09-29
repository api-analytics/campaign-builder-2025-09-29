import { Dashboard } from "@/components/Dashboard";

export default function DashboardPage() {
  // Mock user data for prototype
  const user = {
    firstName: "John",
    lastName: "Doe", 
    isAdmin: true,
  };

  return <Dashboard user={user} />;
}