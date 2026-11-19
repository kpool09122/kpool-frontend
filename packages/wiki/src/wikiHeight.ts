const centimetersPerInch = 2.54;
const inchesPerFoot = 12;

/** Keep fractional inches for editing without changing the stored centimeter value. */
export const centimetersToFeetAndInches = (centimeters: number) => {
  const totalHundredths = Math.round(centimeters / centimetersPerInch * 100);
  return {
    feet: Math.floor(totalHundredths / (inchesPerFoot * 100)),
    inches: (totalHundredths % (inchesPerFoot * 100)) / 100,
  };
};

export const feetAndInchesToCentimeters = (feet: number, inches: number): number =>
  Math.round((feet * inchesPerFoot + inches) * centimetersPerInch);

export const formatWikiHeight = (centimeters: number): string => {
  const totalInches = Math.round(centimeters / centimetersPerInch);
  return `${centimeters} cm / ${Math.floor(totalInches / inchesPerFoot)}' ${totalInches % inchesPerFoot}"`;
};
