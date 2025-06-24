export default function ProfileCard() {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 w-full mb-6">
      <div className="flex items-center gap-4">
        <img
          src="https://i.pravatar.cc/100"
          alt="profile"
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h2 className="text-lg font-semibold">Kari Rasmussen</h2>
          <p className="text-gray-500 text-sm">Small Business Owner</p>
        </div>
      </div>
      <div className="mt-4 flex justify-around text-center">
        <div>
          <h3 className="font-bold text-xl">14,850</h3>
          <p className="text-sm text-gray-500">Product Sells</p>
        </div>
        <div>
          <h3 className="font-bold text-xl">30B+</h3>
          <p className="text-sm text-gray-500">Earnings</p>
        </div>
      </div>
    </div>
  );
}
