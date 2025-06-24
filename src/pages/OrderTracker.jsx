import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function OrderTracker() {
  const { orderId } = useParams();
  const [location, setLocation] = useState({ lat: 22.5726, lng: 88.3639 }); // Kolkata
  const [step, setStep] = useState(0);

  const path = [
    { lat: 22.5726, lng: 88.3639 }, // Start
    { lat: 22.5732, lng: 88.3649 },
    { lat: 22.5740, lng: 88.3660 },
    { lat: 22.5748, lng: 88.3672 }, // End
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        const next = (prev + 1) % path.length;
        setLocation(path[next]);
        return next;
      });
    }, 1500); // Update every 1.5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-6 pt-20 bg-white dark:bg-gray-900 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Live Order Tracking</h1>
      <p>Tracking Order ID: <b>{orderId}</b></p>

      <div className="mt-6 w-full h-96 bg-gray-200 dark:bg-gray-800 relative rounded-xl overflow-hidden shadow-lg">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm bg-white px-3 py-2 rounded shadow">
          Mock Google Maps View
        </div>

        {/* Courier pin */}
        <div
          className="absolute w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-lg transition-all duration-700"
          style={{
            left: `${20 + step * 20}%`,
            top: `${30 + step * 10}%`,
          }}
        ></div>
      </div>

      <p className="mt-6">Courier is en route. Location updates every few seconds.</p>
    </div>
  );
}
