---
title: Material Property Prediction
slug: material-property-prediction
order: 3
category: Machine Learning · Tabular Regression
year: "2025"  # src: competition name "Spring 2025 Regression Challenge"
visibility: Public competition project
summary: A piecewise Gaussian Process Regression solution that won an international Kaggle material-property challenge.
metrics:
  - value: "1st"
    label: Place in the Spring 2025 Regression Challenge
  - value: "0.13689"
    label: Final leaderboard score
stack: [Python, Pandas, NumPy, Scikit-learn, Gaussian Process Regression]
links:
  - label: Competition
    url: https://www.kaggle.com/competitions/spring-2025-regression-challenge
seo_description: 1st place solution in the Kaggle Spring 2025 Regression Challenge using piecewise Gaussian Process Regression. Score 0.13689.
---
<!-- src for metrics, stack, links: projects.md, achievements.md. Competition facts: Kaggle competition pages overview, data and leaderboard. The owner's solution notebook is not public on Kaggle or GitHub, so kernels, split rule, validation and score drivers could not be verified and were removed -->

## Problem
The Spring 2025 Regression Challenge asked for a model of the link between a material composition and one of its properties. The training file holds only 50 labelled compositions, and the score is root mean square error, where lower is better. <!-- src: Kaggle competition overview (RMSE, smaller is better) and data pages (50 compositions in the training file), projects.md, achievements.md -->

## How it works
The solution uses piecewise Gaussian Process Regression. The work covered exploratory data analysis, preprocessing, validation and model optimization. <!-- src: achievements.md summary, projects.md overview -->

### Pipeline
- eda | Exploratory analysis | Study the tabular data. <!-- src: achievements.md -->
- prep | Preprocessing | Clean and prepare the features. <!-- src: achievements.md -->
- split | Piecewise split | Divide the data into segments. <!-- src: projects.md -->
- gpr | Gaussian Process models | Fit a regressor for each segment. <!-- src: projects.md -->
- valid | Validation | Check the models on held-out data. <!-- src: achievements.md -->
- opt | Optimization | Tune the models. <!-- src: achievements.md -->
- submit | Submission | Predictions are scored on the leaderboard. <!-- src: achievements.md -->
- eda -> prep
- prep -> split
- split -> gpr
- gpr -> valid
- valid -> opt
- opt -> gpr
- opt -> submit

## Key decisions
- Gaussian Process Regression on a training set of only 50 points, fitted piece by piece. <!-- src: projects.md, Kaggle data page (50 compositions). The reasons are not documented in any public source -->

## Results
- 1st place with a final leaderboard score of 0.13689 RMSE. The second place scored 0.14817. <!-- src: Kaggle leaderboard page (final standings) -->
- 38 teams took part between 29 April and 6 May 2025. <!-- src: Kaggle overview page -->
- International Kaggle competition. <!-- src: achievements.md -->
