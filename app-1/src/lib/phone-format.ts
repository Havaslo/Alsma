export const formatRussianPhone = (value: string): string => {
  let digits = value.replace(/\D/gu, "");
  if (digits === "7" || digits === "8") return "+7";
  if (digits.startsWith("8")) digits = digits.slice(1);
  if (digits.startsWith("7")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return "";

  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ];
  let result = "+7";
  if (groups[0]) result += ` (${groups[0]}`;
  if (groups[0]?.length === 3) result += ")";
  if (groups[1]) result += ` ${groups[1]}`;
  if (groups[2]) result += `-${groups[2]}`;
  if (groups[3]) result += `-${groups[3]}`;
  return result;
};

export const isRussianPhoneComplete = (value: string): boolean =>
  value.replace(/\D/gu, "").length === 11;
