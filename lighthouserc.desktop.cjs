module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2000 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
      },
    },
    collect: {
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        preset: "desktop",
      },
      staticDistDir: "./dist",
      url: ["http://localhost/"],
    },
    upload: {
      outputDir: ".lighthouseci/desktop",
      target: "filesystem",
    },
  },
};
