export interface Achievement {
  title: string;
  file: string; // terminal-style file name shown in the card title bar
  rank: 1 | 3;
  medal: 'gold' | 'bronze';
  category: string;
  summary: string;
  stats: { value: string; label: string; count: { to: number; decimals: number; suffix?: string } }[];
}

export const achievements: Achievement[] = [
  {
    title: '1st Place Winner', file: 'achievements/01-kaggle.log', rank: 1, medal: 'gold',
    category: 'Spring 2025 Regression Challenge · International Kaggle Competition',
    summary: 'Developed a piecewise Gaussian Process Regression pipeline for material-property prediction using tabular data. The work included exploratory data analysis, preprocessing, validation, and model optimization.',
    stats: [{ value: '0.13689', label: 'final leaderboard score', count: { to: 0.13689, decimals: 5 } }],
  },
  {
    title: '3rd Place Winner', file: 'achievements/02-fit.log', rank: 3, medal: 'bronze',
    category: 'FIT Competition, Data Science International Category · Organized by Universitas Kristen Satya Wacana',
    summary: 'Developed two data science solutions using different data modalities: a flood segmentation model using image data and a crop recommendation model using tabular data.',
    stats: [
      { value: '0.8771', label: 'IoU, flood segmentation', count: { to: 0.8771, decimals: 4 } },
      { value: '99.70%', label: 'accuracy, crop recommendation', count: { to: 99.7, decimals: 2, suffix: '%' } },
    ],
  },
];
