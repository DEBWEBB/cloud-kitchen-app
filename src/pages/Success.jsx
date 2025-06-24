import { Link } from "react-router-dom";

export default function Success() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white dark:bg-gray-900 text-black dark:text-white">
      <h1 className="text-3xl font-bold mb-4">✅ Order Placed Successfully!</h1>
      <p className="mb-4">Thank you for ordering with us.</p>
      <Link
        to="/"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Go Back Home
      </Link>
    </div>
  );
  <Link to="/track/your-order-id-here">Track Order</Link>

}
