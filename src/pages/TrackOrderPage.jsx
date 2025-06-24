import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const [courierPos, setCourierPos] = useState({ lat: 22.57, lng: 88.36 }); // Start at Kolkata center

  // Simulate courier movement every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCourierPos((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Mock Order Tracking</h2>

      <div className="relative w-full h-[75vh] bg-gray-200 rounded-lg overflow-hidden shadow">
        <div
          className="absolute w-8 h-8 bg-blue-600 rounded-full text-white flex items-center justify-center text-sm"
          style={{
            transform: "translate(-50%, -50%)",
            top: `${50 + courierPos.lat * 0.1}%`,
            left: `${50 + courierPos.lng * 0.1}%`,
          }}
        >
          🛵
        </div>
        <div className="absolute bottom-2 right-2 text-gray-700 text-xs p-2">
          Courier live (mocked)
        </div>
      </div>
    </div>
  );
}
