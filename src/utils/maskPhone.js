export default function maskPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");

  if (!digits) return "Not available";
  if (digits.length <= 4) return digits;

  return `${digits.slice(0, 2)}${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}
