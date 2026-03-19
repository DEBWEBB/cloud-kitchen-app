const MenuItemCard = ({ item, onAdd }) => {
  return (
    <div className="card overflow-hidden">
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          className="h-44 w-full object-cover"
        />
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              {item.name}
            </h3>
            <span className="chip mt-2 inline-flex capitalize">{item.category}</span>
          </div>
          <span className="price shrink-0">Rs.{item.price}</span>
        </div>
        <p className="muted min-h-[40px] leading-relaxed">{item.description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Freshly prepared
          </span>
          <button className="btn-primary text-sm" onClick={() => onAdd(item)}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
