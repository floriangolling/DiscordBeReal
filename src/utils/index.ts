export const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000);

export const removeDigitsFromEnd = (str: string): string => str.replace(/\d+$/, '');

export const capitalizeFirstCharacter = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const sliceAtChar = (str: string, char: string): string => {
  const index = str.indexOf(char);
  if (index === -1) {
    return str;
  }
  return str.slice(0, index);
};

export function formatChannelName(name: string): string {
  return name.toLowerCase().trim().replace(/ /g, '-');
}

export function isValidEpitechMail(mail: string) {
  return mail.endsWith('@epitech.eu');
}

export function getCurrentYear(): number {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  return currentMonth >= 1 && currentMonth <= 8 ? currentYear - 1 : currentYear;
}

export function getTekYearFromPromotion(
  promotionYear: number,
  cursusNbYear: number = 5,
): number {
  return cursusNbYear + 1 - (promotionYear - getCurrentYear());
}

/**
 * Get the promotion year from the TEK year
 * @param tekYear - The TEK year
 * @param cursusNbYear - The number of year in the cursus (default 5)
 * @returns The promotion year
 */
export function getPromotionFromTekYear(tekYear: number, cursusNbYear: number = 5): number {
  return getCurrentYear() + cursusNbYear - tekYear + 1;
}
