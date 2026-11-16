export interface SSBCentre {
  code: string;
  short: string;
  city: string;
  label: string;
}

const centre = (code: string, short: string, city: string): SSBCentre => ({
  code,
  short,
  city,
  label: `${short} – ${city}`,
});

export const SSB_CENTRES: SSBCentre[] = [
  centre('sce', 'Selection Centre East (SCE)', 'Prayagraj'),
  centre('scc', 'Selection Centre Central (SCC)', 'Bhopal'),
  centre('scs', 'Selection Centre South (SCS)', 'Bengaluru'),
  centre('scn', 'Selection Centre North (SCN)', 'Jalandhar'),
  centre('1-afsb', '1 AFSB', 'Dehradun'),
  centre('2-afsb', '2 AFSB', 'Mysuru'),
  centre('3-afsb', '3 AFSB', 'Gandhinagar'),
  centre('4-afsb', '4 AFSB', 'Varanasi'),
  centre('5-afsb', '5 AFSB', 'Guwahati'),
  centre('nsb-coimbatore', 'NSB Coimbatore', 'Coimbatore'),
  centre('nsb-visakhapatnam', 'NSB Visakhapatnam', 'Visakhapatnam'),
  centre('nsb-kolkata', 'NSB Kolkata', 'Kolkata'),
  centre('12-ssb', '12 SSB', 'Bengaluru'),
  centre('33-ssb', '33 SSB', 'Bhopal'),
];

export const getCentre = (code?: string | null): SSBCentre | undefined =>
  SSB_CENTRES.find((c) => c.code === code);
