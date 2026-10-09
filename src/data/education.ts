export const education = {
  school: 'Institut Teknologi Sepuluh Nopember',
  schoolShort: 'Institut Teknologi Sepuluh Nopember (B.Comp.Sci)',
  degree: 'Bachelor of Computer Science',
  program: 'Information Technology',
  location: 'Indonesia',
  period: '2023 - 2027 (expected)',
  gpa: '3.80 / 4.00',
  logo: '/media/logos/its.svg',
};

export const languages = [
  { name: 'Indonesian', level: 'Native' },
  { name: 'English', level: 'Intermediate' },
];

export interface Certification {
  title: string;
  issuer: string;
  issued: string;
  issuedShort: string;
  id: string;
  url: string;
  action: string;
}

export const certifications: Certification[] = [
  { title: 'Data Scientist Associate', issuer: 'DataCamp', issued: 'Aug 30, 2026', issuedShort: 'Aug 2026', id: 'DSA0017768401056', url: 'https://www.datacamp.com/certificate/DSA0017768401056', action: 'Verify Credential' },
  { title: 'AI Engineer for Developers Associate', issuer: 'DataCamp', issued: 'Aug 29, 2026', issuedShort: 'Aug 2026', id: 'AIEDA0014229899665', url: 'https://www.datacamp.com/certificate/AIEDA0014229899665', action: 'Verify Credential' },
  { title: 'AI Engineer for Data Scientists Associate', issuer: 'DataCamp', issued: 'Aug 29, 2026', issuedShort: 'Aug 2026', id: 'AEDS0010886080053', url: 'https://www.datacamp.com/certificate/AEDS0010886080053', action: 'Verify Credential' },
  { title: 'Data Engineer Associate', issuer: 'DataCamp', issued: 'Aug 29, 2026', issuedShort: 'Aug 2026', id: 'DEA0011967326731', url: 'https://www.datacamp.com/certificate/DEA0011967326731', action: 'Verify Credential' },
  { title: 'Python Fundamental for Data Science', issuer: 'DQLab', issued: 'July 29, 2025', issuedShort: 'Jul 2025', id: 'DQLABINTP1BNCAQL', url: 'https://academy.dqlab.id/certificate/pdf/DQLABINTP1BNCAQL', action: 'Verify Credential' },
  { title: 'Panduan LLM untuk Developer: Dasar hingga Aplikasi Praktis', issuer: 'Udemy', issued: 'July 2025', issuedShort: 'Jul 2025', id: 'UC-099b0445-17ab-4b3e-a66d-b3913b52e35f', url: 'https://www.udemy.com/certificate/UC-099b0445-17ab-4b3e-a66d-b3913b52e35f/', action: 'Verify Credential' },
];
