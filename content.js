// content.js
console.log("Amazon Review Scraper Content Script Loaded");

async function scrapeReviews() {
  const reviews = [];

  // Overall Rating
  let overallRating = "N/A";
  const overallRatingElement = document.querySelector('span[data-hook="rating-out-of-text"]') ||
    document.querySelector('.a-icon-alt') ||
    document.querySelector('#acrPopover');

  if (overallRatingElement) {
    overallRating = overallRatingElement.innerText.trim() || overallRatingElement.getAttribute("title");
  }

  // Helper to extract reviews from a document/element
  function extractReviewsFromDoc(doc) {
    const extracted = [];

    // Strategy 1: Standard containers
    let reviewElements = doc.querySelectorAll('div[data-hook="review"], div.a-section.review');

    // Strategy 2: If no containers found, try finding bodies and going up
    if (reviewElements.length === 0) {
      const bodies = doc.querySelectorAll('span[data-hook="review-body"]');
      if (bodies.length > 0) {
        // Map bodies to their closest review container (usually has an ID)
        const containers = new Set();
        bodies.forEach(body => {
          const container = body.closest('div[id^="customer_review-"]');
          if (container) containers.add(container);
        });
        reviewElements = Array.from(containers);
      }
    }

    reviewElements.forEach(reviewEl => {
      const ratingEl = reviewEl.querySelector('i[data-hook="review-star-rating"] span.a-icon-alt') ||
        reviewEl.querySelector('i.a-icon-star span.a-icon-alt') ||
        reviewEl.querySelector('i[data-hook="cmps-review-star-rating"] span.a-icon-alt');

      let bodyEl = reviewEl.querySelector('span[data-hook="review-body"] span');
      if (!bodyEl) bodyEl = reviewEl.querySelector('.review-text-content span');
      if (!bodyEl) bodyEl = reviewEl.querySelector('span[data-hook="review-body"]'); // Fallback for direct text

      if (ratingEl && bodyEl) {
        const rating = ratingEl.innerText.trim();
        const text = bodyEl.innerText.trim().replace(/\n/g, " ");
        extracted.push(`${rating},"${text}"`);
      }
    });
    return extracted;
  }

  // 1. Try current page
  let currentReviews = extractReviewsFromDoc(document);
  if (currentReviews.length > 0) {
    return { overallRating, reviews: currentReviews, reviewCount: currentReviews.length };
  }

  // 2. If no reviews, try to find "See all reviews" link and fetch it
  const seeAllLink = document.querySelector('a[data-hook="see-all-reviews-link-foot"]');
  if (seeAllLink) {
    try {
      const response = await fetch(seeAllLink.href);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const fetchedReviews = extractReviewsFromDoc(doc);
      return { overallRating, reviews: fetchedReviews, reviewCount: fetchedReviews.length, source: "fetched" };
    } catch (e) {
      console.error("Failed to fetch reviews page", e);
    }
  }

  return {
    overallRating,
    reviews: [],
    reviewCount: 0
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    scrapeReviews()
      .then(data => sendResponse(data))
      .catch(error => sendResponse({ error: error.toString() }));
    return true; // Required for async sendResponse
  }
});
