module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
      },
    },
    collect: {
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        formFactor: "mobile",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        screenEmulation: {
          disabled: false,
          height: 640,
          mobile: true,
          width: 360,
        },
      },
      staticDistDir: "./dist",
      url: ["http://localhost/"],
    },
    upload: {
      outputDir: ".lighthouseci/mobile",
      target: "filesystem",
    },
  },
};
