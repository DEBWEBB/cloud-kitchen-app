import mioAmoreImage from "../assets/mioamore.jpeg";
import monginisImage from "../assets/monginis.png";

export const shopCatalog = [
  {
    id: "monginis",
    name: "Monginis",
    localName: "মনজিনিস",
    image: monginisImage,
    badge: "Local Cake Shop",
    rating: 4.0,
    reviews: 8,
    type: "Cake shop",
    address: "J96M+2Q5, Bethuadahari, West Bengal 741126",
    mapsUrl: "https://maps.app.goo.gl/1x43oefe3AZnHJZX6",
    priceRange: "",
    tags: ["Cakes", "Bethuadahari", "Local"],
    deliveryTime: "10-20 min",
    minOrder: "Local area only",
    description:
      "Local Bethuadahari cake shop for nearby deliveries and quick celebration orders.",
    subtitle:
      "Browse local cakes and celebration picks available from the Bethuadahari Monginis outlet.",
  },
  {
    id: "mio",
    name: "Mio Amore - Bethuadahari",
    localName: "মিয়া আমর - বিদ্যাডহরী",
    image: mioAmoreImage,
    badge: "Bakery and Cake Shop",
    rating: 4.1,
    reviews: 43,
    type: "Bakery and Cake Shop",
    address: "J96M+2G9, Bethuadahari, West Bengal 741126",
    mapsUrl: "https://maps.app.goo.gl/u1rh75TPUfTxcCcBA",
    priceRange: "Rs.200-Rs.400",
    tags: ["Bakery", "Cakes", "Pastries", "Bethuadahari"],
    deliveryTime: "10-20 min",
    minOrder: "Local area only",
    description:
      "Bethuadahari bakery and cake shop serving cakes, pastries, snacks, and quick local orders.",
    subtitle:
      "Explore local Bethuadahari cakes, pastries, and snack options from the Mio Amore outlet.",
  },
];

export const shopCatalogById = Object.fromEntries(
  shopCatalog.map((shop) => [shop.id, shop])
);

export const getShopById = (shopId) => shopCatalogById[shopId] || shopCatalogById.mio;
