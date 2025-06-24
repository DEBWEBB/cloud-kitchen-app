import ProfileCard from "../components/ProfileCard";
import OrderList from "../components/OrderList";

export default function ProfilePage() {
  return (
    <div className="min-h-screen p-6 bg-orange-50">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="max-w-2xl mx-auto">
        <ProfileCard />
        <OrderList />
      </div>
    </div>
  );
}
