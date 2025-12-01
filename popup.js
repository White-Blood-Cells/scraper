document.getElementById('scrapeBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab.url.includes("amazon.com")) {
            document.getElementById('results').innerText = "Scraping... (this might take a moment)";

            chrome.tabs.sendMessage(activeTab.id, { action: "scrape" }, (response) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message;
                    if (errorMsg.includes("Receiving end does not exist") || errorMsg.includes("Could not establish connection")) {
                        document.getElementById('results').innerText = "Error: Content script not loaded.\nPlease refresh the Amazon page and try again.";
                    } else {
                        document.getElementById('results').innerText = "Error: " + errorMsg;
                    }
                    return;
                }

                if (response && response.reviews) {
                    if (response.reviews.length > 0) {
                        // Create Text content
                        let txtContent = "Rating,Review\n"; // Header

                        response.reviews.forEach(review => {
                            txtContent += review + "\n";
                        });

                        // Trigger download using chrome.downloads API
                        const base64Content = btoa(unescape(encodeURIComponent(txtContent)));
                        const dataUrl = 'data:text/csv;charset=utf-8;base64,' + base64Content;

                        chrome.downloads.download({
                            url: dataUrl,
                            filename: "amazon_reviews.csv",
                            saveAs: false  // Automatically saves to Downloads folder
                        }, (downloadId) => {
                            if (chrome.runtime.lastError) {
                                document.getElementById('results').innerText = "Download failed: " + chrome.runtime.lastError.message;
                            } else {
                                document.getElementById('results').innerText = `Successfully downloaded ${response.reviews.length} reviews to amazon_reviews.csv in your Downloads folder`;
                            }
                        });
                    } else {
                        document.getElementById('results').innerText = "No individual reviews found to export.\nTried main page and 'See all reviews' link.";
                    }
                } else {
                    document.getElementById('results').innerText = "Scraping completed, but no reviews were found or an unexpected response occurred.";
                }
            });
        } else {
            document.getElementById('results').innerText = "Please navigate to an Amazon product page.";
        }
    });
});
